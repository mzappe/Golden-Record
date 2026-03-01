create extension if not exists "pgcrypto";

create type grade_company as enum ('PSA', 'BGS', 'CGC');

-- Provider + ingestion enums
DO $$ BEGIN
  CREATE TYPE provider_key AS ENUM ('pokemon_api', 'pokewallet', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold', 'expired', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('price_below_target', 'new_listing', 'trend_shift');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Canonical providers
create table if not exists public.data_providers (
  id uuid primary key default gen_random_uuid(),
  provider provider_key not null unique,
  name text not null,
  base_url text,
  is_active boolean not null default true,
  rate_limit_per_minute integer,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed primary provider (upsert-safe)
insert into public.data_providers (provider, name, base_url, is_active)
values ('pokemon_api', 'pokemon-api.com', 'https://pokemon-api.com', true)
on conflict (provider) do update
set name = excluded.name,
    base_url = excluded.base_url,
    is_active = excluded.is_active;

-- Canonical TCG set catalog
create table if not exists public.tcg_sets (
  id uuid primary key default gen_random_uuid(),
  external_set_id text,
  name text not null,
  series text,
  release_date date,
  total_cards integer,
  symbol_url text,
  logo_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tcg_sets_external_set_id_uidx
  on public.tcg_sets (external_set_id)
  where external_set_id is not null;

-- Canonical card catalog
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.tcg_sets(id) on delete set null,
  external_card_id text,
  card_name text not null,
  card_number text,
  rarity text,
  image_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cards_external_card_id_uidx
  on public.cards (external_card_id)
  where external_card_id is not null;

create index if not exists cards_set_id_idx
  on public.cards (set_id);

-- External provider mapping for cards
create table if not exists public.card_provider_map (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  provider_id uuid not null references public.data_providers(id) on delete cascade,
  provider_card_id text not null,
  provider_slug text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider_id, provider_card_id)
);

create index if not exists card_provider_map_card_id_idx
  on public.card_provider_map (card_id);

-- Raw market listings (normalized)
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.data_providers(id) on delete restrict,
  provider_listing_id text not null,
  card_id uuid references public.cards(id) on delete set null,
  title text not null,
  listing_url text,
  currency text not null default 'USD',
  price_cents integer not null check (price_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  grade_company grade_company,
  grade_value numeric(3, 1) check (grade_value >= 1 and grade_value <= 10),
  seller_name text,
  location text,
  status listing_status not null default 'unknown',
  listed_at timestamptz,
  sold_at timestamptz,
  captured_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  unique(provider_id, provider_listing_id)
);

create index if not exists market_listings_card_id_idx
  on public.market_listings (card_id);

create index if not exists market_listings_captured_at_idx
  on public.market_listings (captured_at desc);

-- Daily price snapshots (for trends and alert baselines)
create table if not exists public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  provider_id uuid references public.data_providers(id) on delete set null,
  grade_company grade_company,
  grade_value numeric(3, 1) check (grade_value >= 1 and grade_value <= 10),
  snapshot_day date not null,
  low_cents integer check (low_cents >= 0),
  high_cents integer check (high_cents >= 0),
  avg_cents integer check (avg_cents >= 0),
  median_cents integer check (median_cents >= 0),
  sample_count integer not null default 0 check (sample_count >= 0),
  created_at timestamptz not null default now(),
  unique(card_id, provider_id, grade_company, grade_value, snapshot_day)
);

create index if not exists price_snapshots_card_day_idx
  on public.price_snapshots (card_id, snapshot_day desc);

-- Existing watch targets (user-owned)
create table if not exists public.watch_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.cards(id) on delete set null,
  card_name text not null,
  set_name text not null,
  card_number text not null,
  grade_company grade_company not null,
  grade_value numeric(3, 1) not null check (grade_value >= 1 and grade_value <= 10),
  max_price_cents integer not null check (max_price_cents > 0),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.watch_targets add column if not exists card_id uuid references public.cards(id) on delete set null;
alter table public.watch_targets add column if not exists is_active boolean not null default true;
alter table public.watch_targets add column if not exists notes text;
alter table public.watch_targets add column if not exists cover_url text;
alter table public.watch_targets add column if not exists is_shared boolean not null default true;

create index if not exists watch_targets_user_id_created_idx
  on public.watch_targets (user_id, created_at desc);

create index if not exists watch_targets_card_id_idx
  on public.watch_targets (card_id);

-- Matched listing events for watch targets
create table if not exists public.watch_target_matches (
  id uuid primary key default gen_random_uuid(),
  watch_target_id uuid not null references public.watch_targets(id) on delete cascade,
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  match_price_cents integer not null check (match_price_cents >= 0),
  discount_bps integer,
  matched_at timestamptz not null default now(),
  unique(watch_target_id, listing_id)
);

create index if not exists watch_target_matches_target_idx
  on public.watch_target_matches (watch_target_id, matched_at desc);

-- User alerts
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_target_id uuid references public.watch_targets(id) on delete set null,
  match_id uuid references public.watch_target_matches(id) on delete set null,
  alert_type alert_type not null,
  channel text not null default 'email',
  status text not null default 'pending',
  message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alerts_user_created_idx
  on public.alerts (user_id, created_at desc);

-- Ingestion observability / provider adapter runs
create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.data_providers(id) on delete cascade,
  run_type text not null,
  status text not null,
  records_read integer not null default 0,
  records_written integer not null default 0,
  error_text text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ingestion_runs_provider_started_idx
  on public.ingestion_runs (provider_id, started_at desc);

-- Public profile data for social features
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    split_part(lower(new.email), '@', 1)
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, display_name)
select
  u.id,
  lower(u.email),
  split_part(lower(u.email), '@', 1)
from auth.users u
on conflict (id) do update
set email = excluded.email;

-- Friend graph
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.friendships drop constraint if exists friendships_user_id_fkey;
alter table public.friendships drop constraint if exists friendships_friend_id_fkey;
alter table public.friendships add constraint friendships_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.friendships add constraint friendships_friend_id_fkey foreign key (friend_id) references public.profiles(id) on delete cascade;
alter table public.friendships drop constraint if exists friendships_user_friend_check;
alter table public.friendships add constraint friendships_user_friend_check check (user_id <> friend_id);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

create index if not exists friendships_user_idx
  on public.friendships (user_id, status, created_at desc);

create index if not exists friendships_friend_idx
  on public.friendships (friend_id, status, created_at desc);

-- Direct messages between friends
create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

alter table public.social_messages drop constraint if exists social_messages_sender_id_fkey;
alter table public.social_messages drop constraint if exists social_messages_recipient_id_fkey;
alter table public.social_messages add constraint social_messages_sender_id_fkey foreign key (sender_id) references public.profiles(id) on delete cascade;
alter table public.social_messages add constraint social_messages_recipient_id_fkey foreign key (recipient_id) references public.profiles(id) on delete cascade;
create index if not exists social_messages_pair_created_idx
  on public.social_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

-- RLS
alter table public.watch_targets enable row level security;
alter table public.watch_target_matches enable row level security;
alter table public.alerts enable row level security;
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.social_messages enable row level security;

-- watch_targets policies
DROP POLICY IF EXISTS "read own watch targets" ON public.watch_targets;
DROP POLICY IF EXISTS "read own or shared friend watch targets" ON public.watch_targets;
DROP POLICY IF EXISTS "insert own watch targets" ON public.watch_targets;
DROP POLICY IF EXISTS "update own watch targets" ON public.watch_targets;
DROP POLICY IF EXISTS "delete own watch targets" ON public.watch_targets;

create policy "read own or shared friend watch targets"
  on public.watch_targets
  for select
  using (
    auth.uid() = user_id
    or (
      is_shared = true
      and exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
            (f.user_id = auth.uid() and f.friend_id = watch_targets.user_id)
            or (f.friend_id = auth.uid() and f.user_id = watch_targets.user_id)
          )
      )
    )
  );

create policy "insert own watch targets"
  on public.watch_targets
  for insert
  with check (auth.uid() = user_id);

create policy "update own watch targets"
  on public.watch_targets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own watch targets"
  on public.watch_targets
  for delete
  using (auth.uid() = user_id);

-- watch_target_matches policies (ownership via watch_targets)
DROP POLICY IF EXISTS "read own watch target matches" ON public.watch_target_matches;

create policy "read own watch target matches"
  on public.watch_target_matches
  for select
  using (
    exists (
      select 1
      from public.watch_targets wt
      where wt.id = watch_target_id
        and wt.user_id = auth.uid()
    )
  );

-- alerts policies
DROP POLICY IF EXISTS "read own alerts" ON public.alerts;

create policy "read own alerts"
  on public.alerts
  for select
  using (auth.uid() = user_id);

-- profiles policies
DROP POLICY IF EXISTS "read profiles for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

create policy "read profiles for authenticated users"
  on public.profiles
  for select
  using (auth.uid() is not null);

create policy "insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- friendships policies
DROP POLICY IF EXISTS "read own friendships" ON public.friendships;
DROP POLICY IF EXISTS "create friendship request" ON public.friendships;
DROP POLICY IF EXISTS "update own friendships" ON public.friendships;
DROP POLICY IF EXISTS "delete own friendships" ON public.friendships;

create policy "read own friendships"
  on public.friendships
  for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "create friendship request"
  on public.friendships
  for insert
  with check (auth.uid() = user_id);

create policy "update own friendships"
  on public.friendships
  for update
  using (auth.uid() = user_id or auth.uid() = friend_id)
  with check (auth.uid() = user_id or auth.uid() = friend_id);

create policy "delete own friendships"
  on public.friendships
  for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- social_messages policies
DROP POLICY IF EXISTS "read own social messages" ON public.social_messages;
DROP POLICY IF EXISTS "insert own social messages" ON public.social_messages;

create policy "read own social messages"
  on public.social_messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "insert own social messages"
  on public.social_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = sender_id and f.friend_id = recipient_id)
          or (f.user_id = recipient_id and f.friend_id = sender_id)
        )
    )
  );
