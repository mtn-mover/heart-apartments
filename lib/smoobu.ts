/**
 * Smoobu channel-manager client.
 *
 * Smoobu is the source of truth for calendar + nightly rates; Diana manages
 * both in the Smoobu app. This client only reads rates/availability and
 * writes direct-booking reservations (Smoobu then blocks Airbnb/Booking.com).
 *
 * Endpoint/field names follow docs.smoobu.com (base https://login.smoobu.com/api,
 * `Api-Key` header). NOTE for Phase 2 (first run against a real account):
 * verify these against the current docs — Smoobu is deprecating plain API-key
 * auth in favour of HMAC-signed requests (announced sunset Sept 2026), so the
 * auth layer below is isolated in `authHeaders()` to swap in one place.
 */

import { getSmoobuMock } from './smoobu-mock';

export interface DailyRate {
  priceRappen: number | null; // null = no rate maintained for that day
  minStay: number;
  available: boolean;
}

export interface CreateReservationInput {
  propertyId: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD, exclusive
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  adults: number;
  children: number;
  priceRappen: number;
  reference: string; // our LH-XXXXXX, stored in the Smoobu notice for reconciliation
  language?: string;
}

export interface SmoobuApi {
  /** Per-day rate + availability for [startDate, endDate], keyed by YYYY-MM-DD. */
  getRates(propertyId: number, startDate: string, endDate: string): Promise<Record<string, DailyRate>>;
  /** Never auto-retried by callers — not idempotent. */
  createReservation(input: CreateReservationInput): Promise<{ id: number }>;
  cancelReservation(id: number): Promise<void>;
  /** Reconciliation after an ambiguous createReservation (timeout): find our
   *  reservation by the LH reference we put into the notice field. */
  findReservationByReference(
    propertyId: number,
    reference: string,
    range: { from: string; to: string }
  ): Promise<{ id: number } | null>;
  /** Single reservation by id, null when it doesn't exist (404). Used by the
   *  Smoobu webhook to verify a payload against the API before acting on it. */
  getReservation(id: number): Promise<{ id: number; cancelled: boolean } | null>;
}

export class SmoobuError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'SmoobuError';
  }
  /** True when Smoobu rejected the reservation itself (dates taken, validation),
   *  as opposed to transport/auth/server trouble. */
  get isRejection(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500 && this.status !== 401 && this.status !== 429;
  }
}

const BASE_URL = 'https://login.smoobu.com/api';

function authHeaders(): Record<string, string> {
  const key = process.env.SMOOBU_API_KEY;
  if (!key) throw new SmoobuError('SMOOBU_API_KEY is not set', null);
  return { 'Api-Key': key, 'Content-Type': 'application/json' };
}

async function request(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  retryOnce = false
): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: authHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      if (retryOnce && attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new SmoobuError(`Smoobu request failed: ${String(err)}`, null);
    }

    if (res.ok) {
      if (res.status === 204) return null;
      return res.json();
    }

    if (retryOnce && attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }

    const errBody = await res.text().catch(() => '');
    throw new SmoobuError(`Smoobu ${method} ${path} → ${res.status}`, res.status, errBody);
  }
}

interface SmoobuRateDay {
  price: number | null;
  min_length_of_stay?: number;
  available?: number | boolean;
}

interface SmoobuReservationListItem {
  id: number;
  notice?: string | null;
  'guest-name'?: string;
}

const realClient: SmoobuApi = {
  async getRates(propertyId, startDate, endDate) {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    params.append('apartments[]', String(propertyId));
    const raw = (await request('GET', `/rates?${params}`, undefined, true)) as {
      data?: Record<string, Record<string, SmoobuRateDay>>;
    };
    const days = raw?.data?.[String(propertyId)] ?? {};
    const out: Record<string, DailyRate> = {};
    for (const [date, day] of Object.entries(days)) {
      out[date] = {
        priceRappen: day.price == null ? null : Math.round(day.price * 100),
        minStay: day.min_length_of_stay ?? 1,
        available: day.available === 1 || day.available === true,
      };
    }
    return out;
  },

  async createReservation(input) {
    const body: Record<string, unknown> = {
      arrivalDate: input.checkIn,
      departureDate: input.checkOut,
      apartmentId: input.propertyId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? '',
      adults: input.adults,
      children: input.children,
      price: input.priceRappen / 100,
      priceStatus: 1, // paid (charged via Stripe on our side)
      notice: `Direktbuchung Website ${input.reference}`,
      language: input.language ?? 'en',
    };
    const channelId = process.env.SMOOBU_CHANNEL_ID;
    if (channelId) body.channelId = Number(channelId);

    const raw = (await request('POST', '/reservations', body)) as { id?: number };
    if (typeof raw?.id !== 'number') {
      throw new SmoobuError('Smoobu createReservation returned no id', null, raw);
    }
    return { id: raw.id };
  },

  async cancelReservation(id) {
    await request('DELETE', `/reservations/${id}`);
  },

  async findReservationByReference(propertyId, reference, range) {
    const params = new URLSearchParams({
      apartmentId: String(propertyId),
      from: range.from,
      to: range.to,
    });
    const raw = (await request('GET', `/reservations?${params}`, undefined, true)) as {
      bookings?: SmoobuReservationListItem[];
    };
    const match = raw?.bookings?.find((b) => b.notice?.includes(reference));
    return match ? { id: match.id } : null;
  },

  async getReservation(id) {
    try {
      // Cancelled reservations come back with is-blocked-booking/type markers;
      // verify field names against docs.smoobu.com in phase 2. A 404 (deleted)
      // is treated as cancelled=true by the caller via null.
      const raw = (await request('GET', `/reservations/${id}`, undefined, true)) as {
        id?: number;
        type?: string | null;
      };
      if (typeof raw?.id !== 'number') return null;
      return { id: raw.id, cancelled: raw.type === 'cancellation' };
    } catch (err) {
      if (err instanceof SmoobuError && err.status === 404) return null;
      throw err;
    }
  },
};

export function getSmoobu(): SmoobuApi {
  if (process.env.SMOOBU_MOCK === '1' || !process.env.SMOOBU_API_KEY) {
    return getSmoobuMock();
  }
  return realClient;
}
