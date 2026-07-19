import { neon, NeonQueryFunction, types } from '@neondatabase/serverless';

/**
 * Neon Postgres access (little-heart-db). One serverless HTTP driver for
 * everything — chatbot RAG, chat history, direct bookings. Server-only:
 * DATABASE_URL must never reach the client bundle.
 *
 * Usage: const sql = getSql(); const rows = await sql`select … where id = ${id}`;
 * Template values are parameterized by the driver. Errors carry the Postgres
 * SQLSTATE in err.code (e.g. 23P01 exclusion violation, 23505 unique).
 */

// pg-types defaults the driver inherits are wrong for how this app uses two
// column kinds; override them globally before the first query:
//  - date (OID 1082): default parses to a JS Date at LOCAL midnight, which
//    serialises to the PREVIOUS UTC day on a +hours host and breaks every
//    date round-trip (Smoobu, emails, confirmation). Keep the raw 'YYYY-MM-DD'.
//  - int8 (OID 20): default returns a string; smoobu_reservation_id is used as
//    a number (Stripe rollback, mock Map key). Smoobu ids are well within
//    2^53, so Number() is safe here.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sqlInstance = neon(url);
  }
  return sqlInstance;
}

export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

// --- Table types ---

export interface SearchResult {
  id: number;
  content: string;
  source: string;
  similarity: number;
}

export interface ChatSession {
  id: string;
  created_at: string;
  locale: string;
  guest_name?: string;
  guest_email?: string;
  apartment?: string | null;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// --- Direct booking tables (see db/migrations/002_booking.sql) ---

export interface PropertyConfig {
  id: string; // 'heart1'..'heart5'
  smoobu_property_id: number | null;
  active: boolean;
  cleaning_fee_rappen: number;
  direct_discount_pct: number;
  city_tax_per_adult_night_rappen: number;
  min_nights_fallback: number;
  address: string | null;
  checkin_time: string;
  checkout_time: string;
}

export type BookingStatus =
  | 'pending_payment'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface BookingRow {
  id: string;
  reference: string;
  apartment_id: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD, exclusive (departure day)
  adults: number;
  children: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_message: string | null;
  locale: string;
  price_breakdown: import('./booking/pricing').QuoteBreakdown;
  total_rappen: number;
  status: BookingStatus;
  stripe_payment_intent_id: string | null;
  smoobu_reservation_id: number | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
