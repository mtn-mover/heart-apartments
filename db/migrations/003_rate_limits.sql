-- Fixed-window rate limiting backed by the existing Neon DB (no extra
-- service). One row per bucket:ip key; lib/rate-limit.ts updates it
-- atomically. Old rows are cleaned opportunistically.

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);
