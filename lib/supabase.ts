import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to prevent build-time errors
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not set');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// For backwards compatibility
export const supabase = {
  from: (table: string) => getSupabase().from(table),
  rpc: (fn: string, params?: Record<string, unknown>) => getSupabase().rpc(fn, params),
};

// Server-side client with service key for admin operations
export function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase environment variables are not set');
  }

  return createClient(supabaseUrl, serviceKey);
}

// Types for database tables
export interface Document {
  id: number;
  content: string;
  source: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  created_at: string;
  locale: string;
  guest_name?: string;
  guest_email?: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SearchResult {
  id: number;
  content: string;
  source: string;
  similarity: number;
}

// --- Direct booking tables (see supabase/migrations/20260718000000_booking.sql) ---

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
