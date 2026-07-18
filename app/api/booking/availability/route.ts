import { NextRequest } from 'next/server';
import { getSmoobu } from '@/lib/smoobu';
import { jsonError, loadPropertyConfig, resolveSmoobuPropertyId } from '@/lib/booking/service';
import { addDaysString, isDateString } from '@/lib/booking/dates';

/**
 * GET /api/booking/availability?apartment=heart1&month=2026-08
 *
 * Day-level availability for one calendar month (+7 days lookahead so a range
 * ending early next month works without a second fetch). No prices here —
 * the quote endpoint is the only price source.
 *
 * Cached at the CDN per apartment+month; quote/create always go live.
 */
export async function GET(req: NextRequest) {
  const apartment = req.nextUrl.searchParams.get('apartment') ?? '';
  const month = req.nextUrl.searchParams.get('month') ?? '';

  if (!/^\d{4}-\d{2}$/.test(month) || !isDateString(`${month}-01`)) {
    return jsonError(400, 'invalid_month');
  }

  const cfg = await loadPropertyConfig(apartment);
  if (!cfg) return jsonError(404, 'unknown_apartment');

  const inactive = Response.json(
    { active: false },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
  );

  if (!cfg.active) return inactive;
  const propertyId = resolveSmoobuPropertyId(cfg);
  if (!propertyId) return inactive;

  const start = `${month}-01`;
  const end = addDaysString(addDaysString(start, 27), 14); // safely covers the month + 1 week

  let rates;
  try {
    rates = await getSmoobu().getRates(propertyId, start, end);
  } catch (err) {
    console.error('[availability] Smoobu error:', err);
    return jsonError(502, 'availability_unavailable');
  }

  const days = Object.entries(rates)
    .filter(([date]) => date >= start)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({
      date,
      available: day.available && day.priceRappen != null && day.priceRappen > 0,
      minStay: day.minStay,
    }));

  return Response.json(
    { active: true, directDiscountPct: Number(cfg.direct_discount_pct) || 0, days },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
  );
}
