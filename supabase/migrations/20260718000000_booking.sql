-- Direct booking: property_config, bookings, webhook_events
-- Apply via Supabase Dashboard → SQL Editor (DDL is not possible through the JS client).
-- Verify afterwards with: npx tsx scripts/check-booking-schema.ts

-- Needed for the gist exclusion constraint on (text =, daterange &&)
create extension if not exists btree_gist with schema extensions;

-- Per-property booking configuration. Content (texts, images, specs) stays in
-- data/apartments.ts; this table only holds what direct booking needs.
create table if not exists property_config (
  id text primary key,                                   -- 'heart1'..'heart5' (= data/apartments.ts id)
  smoobu_property_id integer unique,                     -- null until Smoobu onboarding is done
  active boolean not null default false,                 -- soft-launch switch per apartment
  cleaning_fee_rappen integer not null default 0,
  direct_discount_pct numeric(4,1) not null default 0,
  city_tax_per_adult_night_rappen integer not null default 320,
  min_nights_fallback integer not null default 2,
  address text,                                          -- only used in confirmation email, never public
  checkin_time text not null default '16:00',
  checkout_time text not null default '10:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Direct bookings only. OTA bookings live in Smoobu and are not mirrored here.
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,                        -- e.g. 'LH-A7K3XQ'
  apartment_id text not null references property_config(id),
  check_in date not null,
  check_out date not null,                               -- exclusive (departure day)
  adults integer not null check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_message text,
  locale text not null default 'en',
  price_breakdown jsonb not null,                        -- full quote snapshot (single source for UI + email)
  total_rappen integer not null check (total_rappen > 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','processing','confirmed','failed','expired','cancelled')),
  stripe_payment_intent_id text unique,
  smoobu_reservation_id bigint,
  expires_at timestamptz not null,                       -- pending TTL; expired on-read in the create route
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_dates check (check_out > check_in),
  -- Structural double-booking protection: the second of two concurrent inserts
  -- for an overlapping range fails atomically (API maps this to 409).
  -- daterange defaults to '[)' which matches the exclusive check-out convention.
  constraint no_overlap exclude using gist (
    apartment_id with =,
    daterange(check_in, check_out) with &&
  ) where (status in ('pending_payment','processing','confirmed'))
);

create index if not exists idx_bookings_apartment_checkin on bookings (apartment_id, check_in);

-- At-least-once delivery dedup for Stripe and Smoobu webhooks.
create table if not exists webhook_events (
  id text primary key,                                   -- Stripe event.id / hash of Smoobu payload
  source text not null check (source in ('stripe','smoobu')),
  type text not null,
  payload jsonb,
  processed_at timestamptz not null default now()
);

-- Keep updated_at fresh without relying on app code.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_property_config_updated_at on property_config;
create trigger trg_property_config_updated_at
  before update on property_config
  for each row execute function set_updated_at();

drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- RLS on, deliberately NO policies: these tables hold PII and payment references.
-- Only the service-role client (createServerClient) may touch them; anon gets nothing.
alter table property_config enable row level security;
alter table bookings enable row level security;
alter table webhook_events enable row level security;
