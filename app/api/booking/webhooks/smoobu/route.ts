import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/booking/service';
import { getSmoobu } from '@/lib/smoobu';
import { sendEmail } from '@/lib/email/resend';
import { hostCancellationEmail } from '@/lib/email/templates';
import { getSql, pgErrorCode } from '@/lib/db';
import type { BookingRow } from '@/lib/db';

/**
 * Smoobu webhook (configured as https://<site>/api/booking/webhooks/smoobu?token=…).
 *
 * Smoobu does not sign payloads, so: shared-secret token in the URL, and the
 * only automated effect is informational (mark our direct booking cancelled
 * + email Diana) — no money moves based on this endpoint. OTA bookings are
 * NOT mirrored here; Smoobu stays their source of truth.
 *
 * Cancellations are verified against the Smoobu API before processing (fail
 * closed). Phase 2 with a real account: verify the exact action names /
 * payload / cancellation-marker fields against docs.smoobu.com.
 */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SMOOBU_WEBHOOK_SECRET;
  if (!secret) return jsonError(503, 'webhook_not_configured');
  if (!tokenMatches(req.nextUrl.searchParams.get('token') ?? '', secret)) {
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
  const sql = getSql();

  // Dedup identical deliveries (Smoobu retries on non-2xx).
  const eventId =
    'smoobu-' + createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 40);
  try {
    await sql`
      insert into webhook_events (id, source, type, payload)
      values (${eventId}, 'smoobu', ${action}, ${JSON.stringify(body)}::jsonb)
    `;
  } catch (err) {
    if (pgErrorCode(err) === '23505') return Response.json({ received: true, duplicate: true });
    console.error('[smoobu-webhook] dedup insert failed:', err);
    return Response.json({ received: true }); // never trigger retry storms
  }

  if (action === 'cancelReservation' && reservationId > 0) {
    // Never trust the payload alone: confirm via the API that this reservation
    // is really gone/cancelled before touching our booking. Fail closed — if
    // Smoobu says it still exists uncancelled, ignore the webhook.
    try {
      const current = await getSmoobu().getReservation(reservationId);
      if (current && !current.cancelled) {
        console.warn(
          `[smoobu-webhook] cancelReservation for ${reservationId}, but API says it is still active — ignoring`
        );
        return Response.json({ received: true, ignored: true });
      }
    } catch (err) {
      console.error('[smoobu-webhook] verification fetch failed, ignoring event:', err);
      return Response.json({ received: true, ignored: true });
    }

    const rows = await sql`
      update bookings set status = 'cancelled'
      where smoobu_reservation_id = ${reservationId} and status = 'confirmed'
      returning *
    `;
    const booking = (rows[0] as BookingRow | undefined) ?? null;
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
