/**
 * Shared server-side helpers for the booking API routes.
 * Everything here talks to Neon via lib/db — never import from client
 * components (DATABASE_URL is server-only).
 */

import { getSql, PropertyConfig } from '../db';

export const PENDING_TTL_MINUTES = 30;

// Stable, explicit mock Smoobu ids — must NOT depend on array order in
// data/apartments.ts (reordering would silently reassign an apartment).
const MOCK_SMOOBU_IDS: Record<string, number> = {
  heart1: 9001,
  heart2: 9002,
  heart3: 9003,
  heart4: 9004,
  heart5: 9005,
};

/**
 * Mock mode is for local development only. In production it must be explicitly
 * requested (SMOOBU_MOCK=1) — a missing SMOOBU_API_KEY must NEVER silently fall
 * back to fake availability on the live site (fail closed instead).
 */
export function isMockMode(): boolean {
  if (process.env.SMOOBU_MOCK === '1') return true;
  return process.env.NODE_ENV !== 'production' && !process.env.SMOOBU_API_KEY;
}

export async function loadPropertyConfig(apartmentId: string): Promise<PropertyConfig | null> {
  const sql = getSql();
  const rows = await sql`select * from property_config where id = ${apartmentId}`;
  return (rows[0] as PropertyConfig | undefined) ?? null;
}

/**
 * The Smoobu property id to use for API calls. In mock mode, apartments that
 * are not yet onboarded get a stable fake id so the whole flow works locally.
 */
export function resolveSmoobuPropertyId(cfg: PropertyConfig): number | null {
  if (cfg.smoobu_property_id) return cfg.smoobu_property_id;
  if (isMockMode()) {
    return MOCK_SMOOBU_IDS[cfg.id] ?? null;
  }
  return null;
}

/**
 * On-read expiry: free ranges held by abandoned checkouts. Pendings only
 * matter for the no_overlap constraint (displayed availability comes from
 * Smoobu), so expiring them lazily right before an insert is sufficient —
 * no cron needed.
 */
export async function expireStalePendings(): Promise<void> {
  const sql = getSql();
  await sql`
    update bookings set status = 'expired'
    where status = 'pending_payment' and expires_at <= now()
  `;
}

export function jsonError(status: number, error: string, detail?: unknown): Response {
  return Response.json(detail === undefined ? { error } : { error, detail }, { status });
}
