import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSmoobu, SmoobuError } from '@/lib/smoobu';
import {
  getAdmin,
  jsonError,
  loadPropertyConfig,
  resolveSmoobuPropertyId,
} from '@/lib/booking/service';
import { sendEmail } from '@/lib/email/resend';
import {
  guestConfirmationEmail,
  guestRefundEmail,
  hostNotificationEmail,
} from '@/lib/email/templates';
import type { BookingRow } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

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

  const supabase = getAdmin();

  // At-least-once dedup: only the first insert of this event id proceeds.
  const { error: dedupError } = await supabase
    .from('webhook_events')
    .insert({ id: event.id, source: 'stripe', type: event.type });
  if (dedupError) {
    if (dedupError.code === '23505') return Response.json({ received: true, duplicate: true });
    console.error('[stripe-webhook] dedup insert failed:', dedupError);
    return jsonError(500, 'dedup_failed');
  }

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
        await finalizeBooking(supabase, event.data.object, 'authorized');
        break;
      case 'payment_intent.succeeded':
        await finalizeBooking(supabase, event.data.object, 'captured');
        break;
      case 'payment_intent.canceled': {
        // Arrives after our own cancels (then a no-op) or a dashboard cancel.
        const pi = event.data.object;
        await supabase
          .from('bookings')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id)
          .eq('status', 'pending_payment');
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
    // 500 → Stripe retries; dedup row prevents double side effects because the
    // booking is already claimed (processing) and the resume path continues.
    console.error(`[stripe-webhook] ${event.type} failed:`, err);
    await supabase.from('webhook_events').delete().eq('id', event.id);
    return jsonError(500, 'processing_failed');
  }

  return Response.json({ received: true });
}

async function finalizeBooking(
  supabase: SupabaseClient,
  pi: Stripe.PaymentIntent,
  mode: 'authorized' | 'captured'
): Promise<void> {
  const bookingId = pi.metadata?.bookingId;
  if (!bookingId) {
    console.log('[stripe-webhook] PI without bookingId metadata:', pi.id);
    return;
  }

  // Claim: exactly one worker moves pending_payment → processing.
  const { data: claimed, error: claimError } = await supabase
    .from('bookings')
    .update({ status: 'processing' })
    .eq('id', bookingId)
    .eq('status', 'pending_payment')
    .select()
    .maybeSingle();
  if (claimError) throw new Error(`claim failed: ${claimError.message}`);

  let booking = claimed as BookingRow | null;

  if (!booking) {
    const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    const existing = data as BookingRow | null;

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
  // of ABANDONED checkouts (on-read expiry above handles that).

  // Step 1: ensure the Smoobu reservation exists.
  let reservationId = booking.smoobu_reservation_id;
  if (!reservationId) {
    const cfg = await loadPropertyConfig(supabase, booking.apartment_id);
    const propertyId = cfg ? resolveSmoobuPropertyId(cfg) : null;
    if (!propertyId) throw new Error(`no smoobu property id for ${booking.apartment_id}`);

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
        await supabase.from('bookings').update({ status: 'failed' }).eq('id', booking.id);
        if (mode === 'captured') {
          await trySend(guestRefundEmail(booking));
        }
        return;
      }
      // Transport/server trouble — the reservation MAY exist. Reconcile before
      // giving up; otherwise rethrow so Stripe retries and resume continues.
      const found = await getSmoobu()
        .findReservationByReference(propertyId, booking.reference, {
          from: booking.check_in,
          to: booking.check_out,
        })
        .catch(() => null);
      if (!found) throw err;
      reservationId = found.id;
    }

    await supabase
      .from('bookings')
      .update({ smoobu_reservation_id: reservationId })
      .eq('id', booking.id);
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
        await supabase.from('bookings').update({ status: 'failed' }).eq('id', booking.id);
        return;
      }
      // Already captured on a previous attempt — fine, continue.
    }
  }

  await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);
  console.log(`[stripe-webhook] CONFIRMED ${booking.reference} (smoobu ${reservationId})`);

  // Emails must never flip a confirmed booking.
  const cfg = await loadPropertyConfig(supabase, booking.apartment_id);
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
