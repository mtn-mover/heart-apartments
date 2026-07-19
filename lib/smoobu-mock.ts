/**
 * Deterministic Smoobu mock for local development (SMOOBU_MOCK=1 or no API key),
 * so the whole booking flow is testable before Diana's Smoobu onboarding.
 *
 * Fixtures per month:
 * - 10.–13. blocked (as if OTA-booked)
 * - 20.–24. min stay 3 nights
 * - Fri/Sat nights more expensive; base price varies slightly per property
 *
 * createReservation writes into a module-level map, so the calendar shows a
 * just-made booking as taken immediately. State survives within one dev-server
 * process; a restart clears it.
 */

import type { CreateReservationInput, DailyRate, SmoobuApi } from './smoobu';
import { SmoobuError } from './smoobu';
import { eachNight } from './booking/dates';

interface MockReservation {
  id: number;
  propertyId: number;
  checkIn: string;
  checkOut: string;
  reference: string;
}

const reservations = new Map<number, MockReservation>();
let nextId = 90_000;

function isBlockedFixture(date: string): boolean {
  const day = Number(date.slice(8, 10));
  return day >= 10 && day <= 13;
}

function isReserved(propertyId: number, date: string): boolean {
  for (const r of reservations.values()) {
    if (r.propertyId === propertyId && date >= r.checkIn && date < r.checkOut) return true;
  }
  return false;
}

function nightPriceRappen(propertyId: number, date: string): number {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekend = dow === 5 || dow === 6; // Fri/Sat night
  const base = 17_000 + (propertyId % 10) * 500;
  return weekend ? base + 6_000 : base;
}

const mock: SmoobuApi = {
  async getRates(propertyId, startDate, endDate) {
    const out: Record<string, DailyRate> = {};
    for (const date of eachNight(startDate, endDate)) {
      const day = Number(date.slice(8, 10));
      out[date] = {
        priceRappen: nightPriceRappen(propertyId, date),
        minStay: day >= 20 && day <= 24 ? 3 : 1,
        available: !isBlockedFixture(date) && !isReserved(propertyId, date),
      };
    }
    return out;
  },

  async createReservation(input: CreateReservationInput) {
    for (const night of eachNight(input.checkIn, input.checkOut)) {
      if (isBlockedFixture(night) || isReserved(input.propertyId, night)) {
        console.log(`[smoobu-mock] REJECT reservation ${input.reference}: ${night} not available`);
        throw new SmoobuError(`Mock: ${night} is not available`, 400);
      }
    }
    const id = nextId++;
    reservations.set(id, {
      id,
      propertyId: input.propertyId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reference: input.reference,
    });
    console.log(
      `[smoobu-mock] CREATED reservation ${id} (${input.reference}) ` +
        `${input.checkIn}→${input.checkOut} property ${input.propertyId} ` +
        `CHF ${(input.priceRappen / 100).toFixed(2)} for ${input.firstName} ${input.lastName}`
    );
    return { id };
  },

  async cancelReservation(id) {
    const existed = reservations.delete(id);
    console.log(`[smoobu-mock] CANCEL reservation ${id} (${existed ? 'ok' : 'not found'})`);
  },

  async findReservationByReference(propertyId, reference) {
    for (const r of reservations.values()) {
      if (r.propertyId === propertyId && r.reference === reference) return { id: r.id };
    }
    return null;
  },

  async getReservation(id) {
    const r = reservations.get(id);
    return r ? { id: r.id, cancelled: false } : null; // cancelled ones are deleted in the mock
  },
};

export function getSmoobuMock(): SmoobuApi {
  return mock;
}
