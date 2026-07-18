/**
 * Shared server-side helpers for the booking API routes.
 * Everything here runs with the Supabase service role — never import from
 * client components.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, PropertyConfig } from '../supabase';
import { apartments } from '@/data/apartments';

export const PENDING_TTL_MINUTES = 30;

export function isMockMode(): boolean {
  return process.env.SMOOBU_MOCK === '1' || !process.env.SMOOBU_API_KEY;
}

export function getAdmin(): SupabaseClient {
  return createServerClient();
}

export async function loadPropertyConfig(
  supabase: SupabaseClient,
  apartmentId: string
): Promise<PropertyConfig | null> {
  const { data, error } = await supabase
    .from('property_config')
    .select('*')
    .eq('id', apartmentId)
    .maybeSingle();
  if (error) throw new Error(`property_config load failed: ${error.message}`);
  return (data as PropertyConfig) ?? null;
}

/**
 * The Smoobu property id to use for API calls. In mock mode, apartments that
 * are not yet onboarded get a stable fake id so the whole flow works locally.
 */
export function resolveSmoobuPropertyId(cfg: PropertyConfig): number | null {
  if (cfg.smoobu_property_id) return cfg.smoobu_property_id;
  if (isMockMode()) {
    const index = apartments.findIndex((a) => a.id === cfg.id);
    return index >= 0 ? 9001 + index : null;
  }
  return null;
}

/**
 * On-read expiry: free ranges held by abandoned checkouts. Pendings only
 * matter for the no_overlap constraint (displayed availability comes from
 * Smoobu), so expiring them lazily right before an insert is sufficient —
 * no cron needed.
 */
export async function expireStalePendings(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'expired' })
    .eq('status', 'pending_payment')
    .lt('expires_at', new Date().toISOString());
  if (error) throw new Error(`expiring stale pendings failed: ${error.message}`);
}

export function jsonError(status: number, error: string, detail?: unknown): Response {
  return Response.json(detail === undefined ? { error } : { error, detail }, { status });
}
