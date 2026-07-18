/**
 * Server-side price calculation — the ONLY place a booking price is computed.
 * The client never sends amounts; API routes recompute quotes live from Smoobu
 * rates right before creating a payment.
 *
 * Pure function: config + rates in, breakdown out (deterministic, testable
 * without any API — see scripts/test-pricing.ts).
 */

import type { PropertyConfig } from '../supabase';
import type { DailyRate } from '../smoobu';
import { getApartmentById } from '@/data/apartments';
import { eachNight, isDateString, nightsBetween, todayString, addDaysString } from './dates';

export const BOOKING_HORIZON_DAYS = 548; // ~18 months

export interface NightlyRate {
  date: string;
  rateRappen: number;
}

export interface QuoteBreakdown {
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  currency: 'CHF';
  nightlyRates: NightlyRate[];
  accommodationRappen: number; // sum of Smoobu nightly rates
  discountPct: number;
  discountRappen: number; // direct-booking discount, on accommodation only
  cleaningFeeRappen: number;
  cityTaxRappen: number; // per adult per night; children exempt (v1, to confirm with Diana)
  totalRappen: number;
}

export type QuoteErrorCode =
  | 'invalid_request'
  | 'past_date'
  | 'beyond_horizon'
  | 'max_guests'
  | 'min_stay'
  | 'not_available';

export class QuoteError extends Error {
  constructor(
    public readonly code: QuoteErrorCode,
    message: string,
    public readonly detail?: Record<string, number | string>
  ) {
    super(message);
    this.name = 'QuoteError';
  }
}

export interface QuoteParams {
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

export function computeQuote(
  cfg: PropertyConfig,
  rates: Record<string, DailyRate>,
  params: QuoteParams,
  opts: { today?: string; maxGuests?: number } = {}
): QuoteBreakdown {
  const { apartmentId, checkIn, checkOut } = params;
  const adults = Math.trunc(params.adults);
  const children = Math.trunc(params.children);

  if (!isDateString(checkIn) || !isDateString(checkOut) || checkOut <= checkIn) {
    throw new QuoteError('invalid_request', 'Invalid date range');
  }
  if (!Number.isFinite(adults) || !Number.isFinite(children) || adults < 1 || children < 0) {
    throw new QuoteError('invalid_request', 'Invalid guest counts');
  }

  const today = opts.today ?? todayString();
  if (checkIn < today) {
    throw new QuoteError('past_date', 'Check-in is in the past');
  }
  if (checkIn > addDaysString(today, BOOKING_HORIZON_DAYS)) {
    throw new QuoteError('beyond_horizon', 'Check-in is too far in the future', {
      horizonDays: BOOKING_HORIZON_DAYS,
    });
  }

  const maxGuests = opts.maxGuests ?? getApartmentById(apartmentId)?.specs.guests;
  if (!maxGuests) {
    throw new QuoteError('invalid_request', `Unknown apartment ${apartmentId}`);
  }
  if (adults + children > maxGuests) {
    throw new QuoteError('max_guests', 'Too many guests for this apartment', { maxGuests });
  }

  const nights = nightsBetween(checkIn, checkOut);
  const nightlyRates: NightlyRate[] = [];
  for (const date of eachNight(checkIn, checkOut)) {
    const day = rates[date];
    if (!day || !day.available || day.priceRappen == null || day.priceRappen <= 0) {
      throw new QuoteError('not_available', 'Not all nights are available', { date });
    }
    nightlyRates.push({ date, rateRappen: day.priceRappen });
  }

  const minStay = Math.max(rates[checkIn]?.minStay ?? 1, cfg.min_nights_fallback);
  if (nights < minStay) {
    throw new QuoteError('min_stay', 'Stay is shorter than the minimum', { minNights: minStay });
  }

  const accommodationRappen = nightlyRates.reduce((sum, n) => sum + n.rateRappen, 0);
  const discountPct = Number(cfg.direct_discount_pct) || 0;
  const discountRappen = Math.round((accommodationRappen * discountPct) / 100);
  const cleaningFeeRappen = cfg.cleaning_fee_rappen;
  const cityTaxRappen = cfg.city_tax_per_adult_night_rappen * adults * nights;
  const totalRappen = accommodationRappen - discountRappen + cleaningFeeRappen + cityTaxRappen;

  return {
    apartmentId,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    currency: 'CHF',
    nightlyRates,
    accommodationRappen,
    discountPct,
    discountRappen,
    cleaningFeeRappen,
    cityTaxRappen,
    totalRappen,
  };
}

/** Group consecutive nights with the same rate for a compact display
 *  (UI + email share this, so both always tell the same story). */
export interface RateGroup {
  from: string;
  toExclusive: string;
  nights: number;
  rateRappen: number;
  subtotalRappen: number;
}

export function groupNightlyRates(nightlyRates: NightlyRate[]): RateGroup[] {
  const groups: RateGroup[] = [];
  for (const n of nightlyRates) {
    const last = groups[groups.length - 1];
    if (last && last.rateRappen === n.rateRappen && last.toExclusive === n.date) {
      last.nights += 1;
      last.toExclusive = addDaysString(n.date, 1);
      last.subtotalRappen += n.rateRappen;
    } else {
      groups.push({
        from: n.date,
        toExclusive: addDaysString(n.date, 1),
        nights: 1,
        rateRappen: n.rateRappen,
        subtotalRappen: n.rateRappen,
      });
    }
  }
  return groups;
}
