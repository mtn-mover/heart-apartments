import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/booking/service';
import { getSql } from '@/lib/db';
import type { BookingRow } from '@/lib/db';

/**
 * GET /api/booking/status?ref=LH-XXXXXX&email=…
 * Minimal status for the confirmation page (which may load before the Stripe
 * webhook has finished). The email must match — weak but sufficient authz for
 * data the guest entered themselves a minute earlier.
 */
export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get('ref') ?? '').trim().toUpperCase();
  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase();

  if (!/^LH-[A-Z2-9]{6}$/.test(ref) || !email) {
    return jsonError(400, 'invalid_request');
  }

  let booking: BookingRow | null;
  try {
    const rows = await getSql()`select * from bookings where reference = ${ref}`;
    booking = (rows[0] as BookingRow | undefined) ?? null;
  } catch (err) {
    console.error('[status] error:', err);
    return jsonError(500, 'status_unavailable');
  }

  if (!booking || booking.guest_email.toLowerCase() !== email) {
    return jsonError(404, 'not_found');
  }

  return Response.json({
    reference: booking.reference,
    status: booking.status,
    apartmentId: booking.apartment_id,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    guestFirstName: booking.guest_first_name,
    quote: booking.price_breakdown,
  });
}
