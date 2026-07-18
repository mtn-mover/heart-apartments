import { NextRequest } from 'next/server';
import { getSmoobu } from '@/lib/smoobu';
import { getStripe } from '@/lib/stripe';
import { computeQuote, QuoteError } from '@/lib/booking/pricing';
import { generateReference } from '@/lib/booking/reference';
import {
  expireStalePendings,
  getAdmin,
  jsonError,
  loadPropertyConfig,
  PENDING_TTL_MINUTES,
  resolveSmoobuPropertyId,
} from '@/lib/booking/service';
import type { BookingRow } from '@/lib/supabase';

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
    body = await req.json();
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

  const supabase = getAdmin();
  const cfg = await loadPropertyConfig(supabase, apartmentId);
  if (!cfg) return jsonError(404, 'unknown_apartment');
  if (!cfg.active) return jsonError(409, 'booking_inactive');
  const propertyId = resolveSmoobuPropertyId(cfg);
  if (!propertyId) return jsonError(409, 'booking_inactive');

  await expireStalePendings(supabase);

  let quote;
  try {
    const rates = await getSmoobu().getRates(propertyId, checkIn, checkOut);
    quote = computeQuote(cfg, rates, { apartmentId, checkIn, checkOut, adults, children });
  } catch (err) {
    if (err instanceof QuoteError) return jsonError(422, err.code, err.detail);
    console.error('[create] quote error:', err);
    return jsonError(502, 'quote_unavailable');
  }

  // Insert the pending booking. A concurrent overlapping insert loses here
  // atomically (exclusion constraint 23P01); reference collisions (23505 on
  // the unique index) just get a fresh code.
  let booking: BookingRow | null = null;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        reference: generateReference(),
        apartment_id: apartmentId,
        check_in: checkIn,
        check_out: checkOut,
        adults: quote.adults,
        children: quote.children,
        guest_first_name: firstName,
        guest_last_name: lastName,
        guest_email: email,
        guest_phone: phone || null,
        guest_message: message || null,
        locale,
        price_breakdown: quote,
        total_rappen: quote.totalRappen,
        status: 'pending_payment',
        expires_at: new Date(Date.now() + PENDING_TTL_MINUTES * 60_000).toISOString(),
      })
      .select()
      .single();

    if (!error) {
      booking = data as BookingRow;
    } else if (error.code === '23P01') {
      return jsonError(409, 'dates_just_taken');
    } else if (error.code !== '23505') {
      console.error('[create] insert error:', error);
      return jsonError(500, 'booking_failed');
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

    await supabase
      .from('bookings')
      .update({ stripe_payment_intent_id: pi.id })
      .eq('id', booking.id);

    return Response.json({
      clientSecret: pi.client_secret,
      reference: booking.reference,
      quote,
    });
  } catch (err) {
    console.error('[create] stripe error:', err);
    // Free the range again — without a PaymentIntent this booking can never proceed.
    await supabase.from('bookings').update({ status: 'failed' }).eq('id', booking.id);
    return jsonError(502, 'payment_init_failed');
  }
}
