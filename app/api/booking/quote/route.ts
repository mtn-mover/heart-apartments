import { NextRequest } from 'next/server';
import { getSmoobu } from '@/lib/smoobu';
import { computeQuote, QuoteError } from '@/lib/booking/pricing';
import { jsonError, loadPropertyConfig, resolveSmoobuPropertyId } from '@/lib/booking/service';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/booking/quote { apartmentId, checkIn, checkOut, adults, children }
 * Live server-side price for a stay. No side effects.
 */
export async function POST(req: NextRequest) {
  // Generous (the UI quotes on every date change) but bounded — each call
  // hits the Smoobu rates API.
  if (!(await rateLimit('book-quote', req, 60, 900))) {
    return jsonError(429, 'rate_limited');
  }

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

  const cfg = await loadPropertyConfig(apartmentId);
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
