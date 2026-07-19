import { getSql } from './db';

/**
 * Fixed-window rate limiter on the existing Neon DB — protects the
 * unauthenticated endpoints (booking create/quote, chat) from calendar
 * blocking and LLM-cost abuse without adding another service.
 *
 * One atomic upsert per check; counts reset when the window has passed.
 * FAIL-OPEN: if the DB check itself errors, the request is allowed — a
 * rate-limiter outage must never take the booking flow down with it.
 */
export async function rateLimit(
  bucket: string,
  req: Request,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const key = `${bucket}:${ip}`;

  try {
    const sql = getSql();
    const rows = await sql`
      insert into rate_limits (key, window_start, count)
      values (${key}, now(), 1)
      on conflict (key) do update set
        count = case
          when rate_limits.window_start > now() - make_interval(secs => ${windowSeconds})
          then rate_limits.count + 1
          else 1
        end,
        window_start = case
          when rate_limits.window_start > now() - make_interval(secs => ${windowSeconds})
          then rate_limits.window_start
          else now()
        end
      returning count
    `;
    const count = Number(rows[0]?.count ?? 1);

    // Opportunistic cleanup of long-stale rows (~1% of requests)
    if (count === 1 && Math.random() < 0.01) {
      sql`delete from rate_limits where window_start < now() - interval '1 day'`.catch(
        () => undefined
      );
    }

    if (count > limit) {
      console.warn(`[rate-limit] ${key} blocked (${count}/${limit} in ${windowSeconds}s)`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[rate-limit] check failed, allowing request:', err);
    return true;
  }
}
