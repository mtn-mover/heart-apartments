import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getAdmin, jsonError } from '@/lib/booking/service';
import { sendEmail } from '@/lib/email/resend';
import { hostCancellationEmail } from '@/lib/email/templates';
import type { BookingRow } from '@/lib/supabase';

/**
 * Smoobu webhook (configured as https://<site>/api/booking/webhooks/smoobu?token=…).
 *
 * Smoobu does not sign payloads, so: shared-secret token in the URL, and the
 * only automated effect is informational (mark our direct booking cancelled
 * + email Diana) — no money moves based on this endpoint. OTA bookings are
 * NOT mirrored here; Smoobu stays their source of truth.
 *
 * Phase 2: verify the exact action names / payload shape against a real
 * account and add an API re-fetch of the reservation before processing.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SMOOBU_WEBHOOK_SECRET;
  if (!secret) return jsonError(503, 'webhook_not_configured');
  if (req.nextUrl.searchParams.get('token') !== secret) {
    return jsonError(401, 'invalid_token');
  }

  let body: { action?: string; data?: { id?: number } };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid_json');
  }

  const action = String(body.action ?? 'unknown');
  const reservationId = Number(body.data?.id ?? 0);
  const supabase = getAdmin();

  // Dedup identical deliveries (Smoobu retries on non-2xx).
  const eventId =
    'smoobu-' + createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 40);
  const { error: dedupError } = await supabase
    .from('webhook_events')
    .insert({ id: eventId, source: 'smoobu', type: action, payload: body });
  if (dedupError) {
    if (dedupError.code === '23505') return Response.json({ received: true, duplicate: true });
    console.error('[smoobu-webhook] dedup insert failed:', dedupError);
    return Response.json({ received: true }); // never trigger retry storms
  }

  if (action === 'cancelReservation' && reservationId > 0) {
    const { data } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('smoobu_reservation_id', reservationId)
      .eq('status', 'confirmed')
      .select()
      .maybeSingle();

    const booking = data as BookingRow | null;
    if (booking) {
      console.log(`[smoobu-webhook] booking ${booking.reference} cancelled via Smoobu`);
      const notify = process.env.BOOKING_NOTIFY_EMAIL;
      if (notify) {
        try {
          await sendEmail(hostCancellationEmail(booking, notify));
        } catch (err) {
          console.error('[smoobu-webhook] email failed:', err);
        }
      }
    }
  } else {
    // New/updated OTA reservations etc. — logged in webhook_events, nothing else.
    console.log(`[smoobu-webhook] logged event: ${action} (reservation ${reservationId || '—'})`);
  }

  return Response.json({ received: true });
}
