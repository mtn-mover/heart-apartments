import { NextRequest } from 'next/server';
import { getSmoobu } from '@/lib/smoobu';
import { computeQuote, QuoteError } from '@/lib/booking/pricing';
import { getAdmin, jsonError, loadPropertyConfig, resolveSmoobuPropertyId } from '@/lib/booking/service';

/**
 * POST /api/booking/quote { apartmentId, checkIn, checkOut, adults, children }
 * Live server-side price for a stay. No side effects.
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

  const supabase = getAdmin();
  const cfg = await loadPropertyConfig(supabase, apartmentId);
  if (!cfg) return jsonError(404, 'unknown_apartment');
  if (!cfg.active) return jsonError(409, 'booking_inactive');
  const propertyId = resolveSmoobuPropertyId(cfg);
  if (!propertyId) return jsonError(409, 'booking_inactive');

  try {
    const rates = await getSmoobu().getRates(propertyId, checkIn, checkOut);
    const quote = computeQuote(cfg, rates, { apartmentId, checkIn, checkOut, adults, children });
    return Response.json({ quote });
  } catch (err) {
    if (err instanceof QuoteError) {
      return jsonError(422, err.code, err.detail);
    }
    console.error('[quote] error:', err);
    return jsonError(502, 'quote_unavailable');
  }
}
