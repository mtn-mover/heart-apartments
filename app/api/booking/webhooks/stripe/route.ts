import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSmoobu, SmoobuError } from '@/lib/smoobu';
import { jsonError, loadPropertyConfig, resolveSmoobuPropertyId } from '@/lib/booking/service';
import { sendEmail } from '@/lib/email/resend';
import {
  guestConfirmationEmail,
  guestRefundEmail,
  hostNotificationEmail,
} from '@/lib/email/templates';
import { getSql } from '@/lib/db';
import type { BookingRow } from '@/lib/db';

export const maxDuration = 60;

/**
 * Stripe webhook — the booking state machine.
 *
 * Card/wallet path (manual capture):
 *   amount_capturable_updated → claim booking → Smoobu reservation
 *     → ok: capture + confirmed + emails
 *     → dates gone: cancel PI (guest never charged) + failed
 * TWINT path (automatic capture — TWINT cannot authorize-only):
 *   succeeded → same sequence, but "dates gone" compensates with a refund.
 *
 * Reliability: webhook_events dedups at-least-once delivery; a guard update
 * (pending_payment → processing) makes exactly one worker own a booking; on
 * a crash Stripe retries and the resume path picks up where it stopped
 * (stored smoobu_reservation_id, or reconciliation via the LH reference in
 * the Smoobu notice).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return jsonError(503, 'webhook_not_configured');

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return jsonError(400, 'invalid_signature');
  }

  const sql = getSql();

  // Record the event; if it already exists this is a redelivery. We do NOT
  // early-return on redelivery: a prior attempt may have died hard (timeout/
  // OOM) after inserting this row but before finishing, which would otherwise
  // strand the booking in 'processing' forever while Stripe stops retrying.
  // Instead we always (re)process — every handler below is idempotent (claim
  // guard, resume via stored reservation id, capture/refund idempotency keys,
  // and the confirm guard that gates emails).
  let isRedelivery = false;
  try {
    const inserted = await sql`
      insert into webhook_events (id, source, type)
      values (${event.id}, 'stripe', ${event.type})
      on conflict (id) do nothing
      returning id
    `;
    isRedelivery = inserted.length === 0;
    if (isRedelivery) {
      console.log('[stripe-webhook] redelivery, reprocessing idempotently:', event.id, event.type);
    }
  } catch (err) {
    console.error('[stripe-webhook] dedup insert failed:', err);
    return jsonError(500, 'dedup_failed');
  }

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
        await finalizeBooking(event.data.object, 'authorized');
        break;
      case 'payment_intent.succeeded':
        await finalizeBooking(event.data.object, 'captured');
        break;
      case 'payment_intent.canceled': {
        // Arrives after our own cancels (then a no-op) or a dashboard cancel.
        const pi = event.data.object;
        await sql`
          update bookings set status = 'failed'
          where stripe_payment_intent_id = ${pi.id} and status = 'pending_payment'
        `;
        break;
      }
      case 'payment_intent.payment_failed':
        // Deliberately NO status change: the guest can retry in the Payment
        // Element with the same PaymentIntent until the pending TTL expires.
        console.log('[stripe-webhook] payment attempt failed:', event.data.object.id);
        break;
      default:
        console.log('[stripe-webhook] ignored event:', event.type);
    }
  } catch (err) {
    // 500 → Stripe retries. We keep the webhook_events row (marking this a
    // redelivery next time) and rely on handler idempotency; the booking may
    // sit in 'processing' between attempts, and the resume path continues it.
    console.error(`[stripe-webhook] ${event.type} failed:`, err);
    return jsonError(500, 'processing_failed');
  }

  return Response.json({ received: true });
}

async function finalizeBooking(
  pi: Stripe.PaymentIntent,
  mode: 'authorized' | 'captured'
): Promise<void> {
  const bookingId = pi.metadata?.bookingId;
  if (!bookingId) {
    console.log('[stripe-webhook] PI without bookingId metadata:', pi.id);
    return;
  }

  const sql = getSql();

  // Claim: exactly one worker moves pending_payment → processing.
  const claimed = await sql`
    update bookings set status = 'processing'
    where id = ${bookingId} and status = 'pending_payment'
    returning *
  `;

  let booking = (claimed[0] as BookingRow | undefined) ?? null;

  const wonClaim = booking !== null;

  if (!booking) {
    const rows = await sql`select * from bookings where id = ${bookingId}`;
    const existing = (rows[0] as BookingRow | undefined) ?? null;

    if (!existing) {
      console.log('[stripe-webhook] no booking for PI:', pi.id);
      return;
    }
    if (existing.status === 'processing') {
      booking = existing; // resume after a crashed/timed-out attempt
    } else if (existing.status === 'confirmed') {
      return; // e.g. succeeded event following our own capture
    } else if (existing.status === 'expired' || existing.status === 'failed' || existing.status === 'cancelled') {
      // Payment came in for a booking that is already dead (on-read expiry
      // freed the range, possibly retaken). Release the guest's money.
      await releasePayment(pi, mode);
      return;
    } else {
      return;
    }
  }
  // Note: no expires_at check after a successful claim — a successful claim
  // means the range is still held by this booking, and voiding a legitimate
  // payment then would only hurt the guest. expires_at exists to free ranges
  // of ABANDONED checkouts (on-read expiry handles that).

  // Defense in depth: the event is signature-verified and only our server can
  // mint a PI carrying this bookingId, but never act on a PI that doesn't match
  // the one we recorded for this booking.
  if (booking.stripe_payment_intent_id && booking.stripe_payment_intent_id !== pi.id) {
    console.error(
      `[stripe-webhook] PI mismatch for ${booking.reference}: booking has ${booking.stripe_payment_intent_id}, event ${pi.id}`
    );
    return;
  }

  // Step 1: ensure the Smoobu reservation exists.
  let reservationId = booking.smoobu_reservation_id;
  if (!reservationId) {
    const cfg = await loadPropertyConfig(booking.apartment_id);
    const propertyId = cfg ? resolveSmoobuPropertyId(cfg) : null;
    if (!propertyId) throw new Error(`no smoobu property id for ${booking.apartment_id}`);

    const findExisting = () =>
      getSmoobu()
        .findReservationByReference(propertyId, booking!.reference, {
          from: booking!.check_in,
          to: booking!.check_out,
        })
        .catch(() => null);

    // Resume path (we did NOT win the claim): another worker may have created
    // the reservation and died before persisting its id — look it up by our
    // reference first instead of blindly creating a duplicate.
    if (!wonClaim) {
      const found = await findExisting();
      if (found) {
        reservationId = found.id;
        console.log(`[stripe-webhook] resume: found existing reservation ${found.id} for ${booking.reference}`);
      }
    }

    if (!reservationId) {
      try {
        const created = await getSmoobu().createReservation({
          propertyId,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          firstName: booking.guest_first_name,
          lastName: booking.guest_last_name,
          email: booking.guest_email,
          phone: booking.guest_phone ?? undefined,
          adults: booking.adults,
          children: booking.children,
          priceRappen: booking.total_rappen,
          reference: booking.reference,
          language: booking.locale,
        });
        reservationId = created.id;
      } catch (err) {
        if (err instanceof SmoobuError && err.isRejection) {
          // The window where an OTA booking beat us: release the money, done.
          console.log(`[stripe-webhook] Smoobu rejected ${booking.reference}:`, err.message);
          await releasePayment(pi, mode);
          await sql`update bookings set status = 'failed' where id = ${booking.id}`;
          if (mode === 'captured') {
            await trySend(guestRefundEmail(booking));
          }
          return;
        }
        // Transport/server trouble — the reservation MAY exist. Reconcile before
        // giving up; otherwise rethrow so Stripe retries and resume continues.
        const found = await findExisting();
        if (!found) throw err;
        reservationId = found.id;
      }
    }

    await sql`update bookings set smoobu_reservation_id = ${reservationId} where id = ${booking.id}`;
    booking = { ...booking, smoobu_reservation_id: reservationId };
  }

  // Step 2 (card path only): capture the authorized amount.
  if (mode === 'authorized') {
    try {
      await getStripe().paymentIntents.capture(pi.id, undefined, {
        idempotencyKey: `capture-${booking.id}`,
      });
    } catch (err) {
      const current = await getStripe().paymentIntents.retrieve(pi.id);
      if (current.status !== 'succeeded') {
        // Very rare (e.g. authorization lapsed): roll the reservation back.
        console.error(`[stripe-webhook] capture failed for ${booking.reference}:`, err);
        await getSmoobu().cancelReservation(reservationId).catch((e) =>
          console.error('[stripe-webhook] rollback cancelReservation failed:', e)
        );
        await releasePayment(pi, mode);
        await sql`update bookings set status = 'failed' where id = ${booking.id}`;
        return;
      }
      // Already captured on a previous attempt — fine, continue.
    }
  }

  // Confirm-and-claim in one step: only the worker that actually flips
  // processing → confirmed sends the emails. Without this guard, the
  // amount_capturable_updated and payment_intent.succeeded events can both
  // reach this point for the same booking and send duplicate confirmations.
  const confirmed = await sql`
    update bookings set status = 'confirmed'
    where id = ${booking.id} and status = 'processing'
    returning id
  `;
  if (confirmed.length === 0) {
    console.log(`[stripe-webhook] ${booking.reference} already confirmed by another worker — no duplicate emails`);
    return;
  }
  console.log(`[stripe-webhook] CONFIRMED ${booking.reference} (smoobu ${reservationId})`);

  const cfg = await loadPropertyConfig(booking.apartment_id);
  if (cfg) await trySend(guestConfirmationEmail(booking, cfg));
  const notify = process.env.BOOKING_NOTIFY_EMAIL;
  if (notify) await trySend(hostNotificationEmail(booking, notify));
}

/** Give the guest their money back: void an authorization, refund a capture. */
async function releasePayment(pi: Stripe.PaymentIntent, mode: 'authorized' | 'captured'): Promise<void> {
  try {
    if (mode === 'authorized') {
      await getStripe().paymentIntents.cancel(pi.id);
    } else {
      await getStripe().refunds.create(
        { payment_intent: pi.id },
        { idempotencyKey: `refund-${pi.id}` }
      );
    }
  } catch (err) {
    console.error(`[stripe-webhook] releasePayment (${mode}) failed for ${pi.id}:`, err);
  }
}

async function trySend(mail: Parameters<typeof sendEmail>[0]): Promise<void> {
  try {
    await sendEmail(mail);
  } catch (err) {
    console.error('[stripe-webhook] email failed:', err);
  }
}
