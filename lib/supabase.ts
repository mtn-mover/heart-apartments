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
