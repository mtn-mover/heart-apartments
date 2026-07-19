import { NextRequest } from 'next/server';
import { getSmoobu } from '@/lib/smoobu';
import { getStripe } from '@/lib/stripe';
import { computeQuote, QuoteError } from '@/lib/booking/pricing';
import { generateReference } from '@/lib/booking/reference';
import {
  expireStalePendings,
  jsonError,
  loadPropertyConfig,
  PENDING_TTL_MINUTES,
  resolveSmoobuPropertyId,
} from '@/lib/booking/service';
import { getSql, pgErrorCode } from '@/lib/db';
import type { BookingRow } from '@/lib/db';

/**
 * POST /api/booking/create
 * { apartmentId, checkIn, checkOut, adults, children, locale,
 *   guest: { firstName, lastName, email, phone?, message? } }
 *
 * Recomputes the quote live (the client never sends amounts), inserts a
 * pending booking (the no_overlap DB constraint is the double-booking guard),
 * then creates the Stripe PaymentIntent:
 * - cards & wallets: manual capture — charged only after Smoobu confirms
 * - TWINT: automatic capture (TWINT cannot authorize-only); compensated by
 *   an automatic refund in the webhook's failure path
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonError(400, 'invalid_json');
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(400, 'invalid_json');
  }

  const apartmentId = String(body.apartmentId ?? '');
  const checkIn = String(body.checkIn ?? '');
  const checkOut = String(body.checkOut ?? '');
  const adults = Number(body.adults);
  const children = Number(body.children ?? 0);
  const locale = body.locale === 'de' ? 'de' : 'en';

  const guest = (body.guest ?? {}) as Record<string, unknown>;
  const firstName = String(guest.firstName ?? '').trim();
  const lastName = String(guest.lastName ?? '').trim();
  const email = String(guest.email ?? '').trim();
  const phone = String(guest.phone ?? '').trim();
  const message = String(guest.message ?? '').trim();

  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
    return jsonError(400, 'invalid_guest_name');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return jsonError(400, 'invalid_guest_email');
  }
  if (phone.length > 40 || message.length > 2000) {
    return jsonError(400, 'invalid_guest_data');
  }

  const cfg = await loadPropertyConfig(apartmentId);
  if (!cfg) return jsonError(404, 'unknown_apartment');
  if (!cfg.active) return jsonError(409, 'booking_inactive');
  const propertyId = resolveSmoobuPropertyId(cfg);
  if (!propertyId) return jsonError(409, 'booking_inactive');

  let quote;
  try {
    const rates = await getSmoobu().getRates(propertyId, checkIn, checkOut);
    quote = computeQuote(cfg, rates, { apartmentId, checkIn, checkOut, adults, children });
  } catch (err) {
    if (err instanceof QuoteError) return jsonError(422, err.code, err.detail);
    console.error('[create] quote error:', err);
    return jsonError(502, 'quote_unavailable');
  }

  // Free abandoned pendings right before the insert (getRates above can take
  // seconds; expiring earlier would leave a just-expired row blocking us).
  const sql = getSql();
  await expireStalePendings();

  // Insert the pending booking. A concurrent overlapping insert loses here
  // atomically (exclusion constraint 23P01); reference collisions (23505 on
  // the unique index) just get a fresh code.
  let booking: BookingRow | null = null;
  let recycledOwnPending = false;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    try {
      const rows = await sql`
        insert into bookings (
          reference, apartment_id, check_in, check_out, adults, children,
          guest_first_name, guest_last_name, guest_email, guest_phone,
          guest_message, locale, price_breakdown, total_rappen, status, expires_at
        ) values (
          ${generateReference()}, ${apartmentId}, ${checkIn}, ${checkOut},
          ${quote.adults}, ${quote.children}, ${firstName}, ${lastName},
          ${email}, ${phone || null}, ${message || null}, ${locale},
          ${JSON.stringify(quote)}::jsonb, ${quote.totalRappen},
          'pending_payment', now() + make_interval(mins => ${PENDING_TTL_MINUTES})
        )
        returning *
      `;
      booking = rows[0] as BookingRow;
    } catch (err) {
      const code = pgErrorCode(err);
      if (code === '23P01') {
        // The overlap might be the guest's OWN abandoned pending (they reloaded
        // the payment page). Free only their own overlapping pending — never
        // someone else's — and retry once, so they aren't locked out for 30 min.
        if (!recycledOwnPending) {
          recycledOwnPending = true;
          const freed = await sql`
            update bookings set status = 'expired'
            where apartment_id = ${apartmentId} and status = 'pending_payment'
              and guest_email = ${email}
              and daterange(check_in, check_out) && daterange(${checkIn}::date, ${checkOut}::date)
            returning id
          `;
          if (freed.length > 0) continue;
        }
        return jsonError(409, 'dates_just_taken');
      }
      if (code !== '23505') {
        console.error('[create] insert error:', err);
        return jsonError(500, 'booking_failed');
      }
    }
  }
  if (!booking) return jsonError(500, 'booking_failed');

  try {
    const pi = await getStripe().paymentIntents.create(
      {
        amount: quote.totalRappen,
        currency: 'chf',
        automatic_payment_methods: { enabled: true },
        payment_method_options: { card: { capture_method: 'manual' } },
        metadata: {
          bookingId: booking.id,
          reference: booking.reference,
          apartmentId,
          checkIn,
          checkOut,
        },
      },
      { idempotencyKey: `pi-create-${booking.id}` }
    );

    await sql`update bookings set stripe_payment_intent_id = ${pi.id} where id = ${booking.id}`;

    return Response.json({
      clientSecret: pi.client_secret,
      reference: booking.reference,
      quote,
    });
  } catch (err) {
    console.error('[create] stripe error:', err);
    // Free the range again — without a PaymentIntent this booking can never proceed.
    await sql`update bookings set status = 'failed' where id = ${booking.id}`.catch(() => undefined);
    return jsonError(502, 'payment_init_failed');
  }
}
