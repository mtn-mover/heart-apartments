/**
 * Invariant tests for the pure pricing engine (no network, no DB).
 * Run: npx tsx scripts/test-pricing.ts
 */

import type { DailyRate } from '../lib/smoobu';
import type { PropertyConfig } from '../lib/supabase';
import { computeQuote, groupNightlyRates, QuoteError } from '../lib/booking/pricing';
import { eachNight } from '../lib/booking/dates';

const cfg: PropertyConfig = {
  id: 'heart1',
  smoobu_property_id: 9001,
  active: true,
  cleaning_fee_rappen: 8000,
  direct_discount_pct: 10,
  city_tax_per_adult_night_rappen: 320,
  min_nights_fallback: 2,
  address: null,
  checkin_time: '16:00',
  checkout_time: '10:00',
};

function rates(
  from: string,
  to: string,
  fn: (date: string) => Partial<DailyRate> = () => ({})
): Record<string, DailyRate> {
  const out: Record<string, DailyRate> = {};
  for (const d of eachNight(from, to)) {
    out[d] = { priceRappen: 20_000, minStay: 1, available: true, ...fn(d) };
  }
  return out;
}

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    failures++;
    console.error(`❌ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}
function expectQuoteError(code: string, fn: () => void) {
  try {
    fn();
  } catch (err) {
    assert(err instanceof QuoteError && err.code === code, `expected ${code}, got ${String(err)}`);
    return;
  }
  throw new Error(`expected QuoteError ${code}, but no error thrown`);
}

const TODAY = '2026-08-01';
const params = { apartmentId: 'heart1', checkIn: '2026-08-10', checkOut: '2026-08-13', adults: 2, children: 1 };
const opts = { today: TODAY, maxGuests: 4 };

check('parts sum to total', () => {
  const q = computeQuote(cfg, rates('2026-08-01', '2026-09-01'), params, opts);
  assert(
    q.totalRappen === q.accommodationRappen - q.discountRappen + q.cleaningFeeRappen + q.cityTaxRappen,
    'sum mismatch'
  );
  assert(q.nights === 3, `nights ${q.nights}`);
  assert(q.accommodationRappen === 60_000, `accommodation ${q.accommodationRappen}`);
});

check('discount applies to accommodation only', () => {
  const q = computeQuote(cfg, rates('2026-08-01', '2026-09-01'), params, opts);
  assert(q.discountRappen === Math.round((60_000 * 10) / 100), `discount ${q.discountRappen}`);
});

check('city tax = rate × adults × nights (children exempt)', () => {
  const q = computeQuote(cfg, rates('2026-08-01', '2026-09-01'), params, opts);
  assert(q.cityTaxRappen === 320 * 2 * 3, `city tax ${q.cityTaxRappen}`);
});

check('rounding: odd discount percentage stays integer rappen', () => {
  const q = computeQuote(
    { ...cfg, direct_discount_pct: 7.5 },
    rates('2026-08-01', '2026-09-01', () => ({ priceRappen: 19_999 })),
    params,
    opts
  );
  assert(Number.isInteger(q.discountRappen) && Number.isInteger(q.totalRappen), 'non-integer rappen');
});

check('min stay of arrival day rejects short stays', () => {
  expectQuoteError('min_stay', () =>
    computeQuote(
      cfg,
      rates('2026-08-01', '2026-09-01', (d) => (d === '2026-08-10' ? { minStay: 5 } : {})),
      params,
      opts
    )
  );
});

check('min_nights_fallback enforced without Smoobu minStay', () => {
  expectQuoteError('min_stay', () =>
    computeQuote(cfg, rates('2026-08-01', '2026-09-01'), { ...params, checkOut: '2026-08-11' }, opts)
  );
});

check('unavailable night rejects', () => {
  expectQuoteError('not_available', () =>
    computeQuote(
      cfg,
      rates('2026-08-01', '2026-09-01', (d) => (d === '2026-08-12' ? { available: false } : {})),
      params,
      opts
    )
  );
});

check('departure day may be unavailable (exclusive check-out)', () => {
  const q = computeQuote(
    cfg,
    rates('2026-08-01', '2026-09-01', (d) => (d === '2026-08-13' ? { available: false } : {})),
    params,
    opts
  );
  assert(q.nights === 3, 'back-to-back turnover must work');
});

check('guest limit rejects', () => {
  expectQuoteError('max_guests', () =>
    computeQuote(cfg, rates('2026-08-01', '2026-09-01'), { ...params, adults: 4, children: 1 }, opts)
  );
});

check('past check-in rejects', () => {
  expectQuoteError('past_date', () =>
    computeQuote(cfg, rates('2026-07-01', '2026-09-01'), { ...params, checkIn: '2026-07-30', checkOut: '2026-08-02' }, opts)
  );
});

check('horizon rejects', () => {
  expectQuoteError('beyond_horizon', () =>
    computeQuote(cfg, rates('2028-03-01', '2028-04-01'), { ...params, checkIn: '2028-03-10', checkOut: '2028-03-13' }, opts)
  );
});

check('missing rate rejects', () => {
  expectQuoteError('not_available', () =>
    computeQuote(
      cfg,
      rates('2026-08-01', '2026-09-01', (d) => (d === '2026-08-11' ? { priceRappen: null } : {})),
      params,
      opts
    )
  );
});

check('grouping preserves the sum and covers every night', () => {
  const q = computeQuote(
    cfg,
    rates('2026-08-01', '2026-09-01', (d) => {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      return { priceRappen: dow === 5 || dow === 6 ? 26_000 : 20_000 };
    }),
    { ...params, checkIn: '2026-08-13', checkOut: '2026-08-18', adults: 2, children: 0 },
    opts
  );
  const groups = groupNightlyRates(q.nightlyRates);
  const groupSum = groups.reduce((s, g) => s + g.subtotalRappen, 0);
  const groupNights = groups.reduce((s, g) => s + g.nights, 0);
  assert(groupSum === q.accommodationRappen, `group sum ${groupSum} ≠ ${q.accommodationRappen}`);
  assert(groupNights === q.nights, `group nights ${groupNights} ≠ ${q.nights}`);
  assert(groups.length > 1, 'expected multiple rate groups (weekend pricing)');
});

console.log(failures === 0 ? '\nAll pricing checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
