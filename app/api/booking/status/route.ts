import { NextRequest } from 'next/server';
import { getAdmin, jsonError } from '@/lib/booking/service';
import type { BookingRow } from '@/lib/supabase';

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

  const { data, error } = await getAdmin()
    .from('bookings')
    .select('*')
    .eq('reference', ref)
    .maybeSingle();

  if (error) {
    console.error('[status] error:', error);
    return jsonError(500, 'status_unavailable');
  }

  const booking = data as BookingRow | null;
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
