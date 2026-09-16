-- AdBite schema, phase 1. See docs/PLAN.md.
--
-- Two kinds of people (advertisers and shop owners), the shops and their
-- boards, the campaigns booked against shops and each shop's decision on
-- them. Devices, creatives and plays are created now so later phases add
-- rows rather than tables; nothing writes to them yet.

create extension if not exists pgcrypto;

-- ---- people ---------------------------------------------------------------

create type account_role as enum ('advertiser', 'shop');

create table accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role account_role,
  stripe_customer_id text,
  stripe_account_id text,
  created_at timestamptz not null default now()
);

-- One row per auth user, made the moment they first sign in. The role is
-- chosen afterwards on the dashboard, which is why it is nullable.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- shops and their boards ----------------------------------------------

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references accounts (id) on delete cascade,
  -- Which entry in lib/network.ts this shop is. Set by hand while the venue
  -- list is static; null for a shop that has signed up but not been placed.
  venue_id text unique,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  hours jsonb not null default '{}'::jsonb,
  -- Where on the screen ads may sit: none | banner | rail | rotation.
  ad_placement text not null default 'rail',
  created_at timestamptz not null default now()
);
create index shops_owner on shops (owner_id);

-- The dashboard's Board type, verbatim. One board per shop; `version` moves
-- on every save and is what a TV's etag is built from.
create table boards (
  shop_id uuid primary key references shops (id) on delete cascade,
  board jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---- advertisers' campaigns -----------------------------------------------

create table creatives (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references accounts (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  name text not null,
  storage_path text,
  bytes integer,
  sha256 text,
  width integer,
  height integer,
  seconds numeric,
  poster_path text,
  ready boolean not null default false,
  created_at timestamptz not null default now()
);
create index creatives_advertiser on creatives (advertiser_id);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references accounts (id) on delete cascade,
  name text not null,
  -- banner | rail | full | video, from lib/boards.ts
  format text not null,
  -- venue ids from lib/network.ts
  venues text[] not null default '{}',
  dayparts text[] not null default '{}',
  ages text[] not null default '{}',
  weekly_spend numeric not null default 0,
  creative_id uuid references creatives (id) on delete set null,
  creative_name text,
  email text,
  note text,
  starts_on date,
  ends_on date,
  status text not null default 'in_review'
    check (status in ('in_review', 'live', 'paused', 'ended')),
  created_at timestamptz not null default now()
);
create index campaigns_advertiser on campaigns (advertiser_id);

-- Each shop decides on each campaign that targets it. Rows are created at
-- booking for every venue that has a shop behind it; the advertiser sees
-- the campaign as live once any shop has said yes.
create table approvals (
  campaign_id uuid not null references campaigns (id) on delete cascade,
  shop_id uuid not null references shops (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_at timestamptz,
  note text,
  primary key (campaign_id, shop_id)
);
create index approvals_shop on approvals (shop_id);

-- ---- TVs -------------------------------------------------------------------

create table devices (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops (id) on delete set null,
  pair_code text unique,
  -- Hashed; the TV sends the plain secret on every sync.
  secret_hash text not null,
  name text,
  screen text not null default 'menu' check (screen in ('menu', 'reel')),
  channel_version text,
  last_seen timestamptz,
  etag_served text,
  assets_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index devices_shop on devices (shop_id);

create table plays (
  id bigint generated always as identity primary key,
  device_id uuid not null references devices (id) on delete cascade,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  played_at timestamptz not null,
  seconds numeric not null
);
create index plays_campaign_time on plays (campaign_id, played_at);
create index plays_device_time on plays (device_id, played_at);

-- ---- row-level security -----------------------------------------------------
-- Browsers talk to these tables directly with the anon key and the user's
-- session. Devices never do; they go through api/ with the service key.

alter table accounts enable row level security;
alter table shops enable row level security;
alter table boards enable row level security;
alter table creatives enable row level security;
alter table campaigns enable row level security;
alter table approvals enable row level security;
alter table devices enable row level security;
alter table plays enable row level security;

create function my_shop_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from shops where owner_id = auth.uid()
$$;

-- accounts: you see and edit only yourself; the trigger makes the row.
create policy accounts_self_read on accounts for select using (id = auth.uid());
create policy accounts_self_write on accounts for update using (id = auth.uid()) with check (id = auth.uid());

-- shops: owners manage their own; advertisers may read the public fields of
-- any shop (the campaign builder lists them).
create policy shops_owner_all on shops for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy shops_public_read on shops for select using (auth.role() = 'authenticated');

-- boards: owners only.
create policy boards_owner_all on boards for all
  using (shop_id in (select my_shop_ids()))
  with check (shop_id in (select my_shop_ids()));

-- creatives and campaigns: advertisers manage their own. Shops read the
-- campaigns that have an approval row for them.
create policy creatives_owner_all on creatives for all
  using (advertiser_id = auth.uid()) with check (advertiser_id = auth.uid());

create policy campaigns_owner_all on campaigns for all
  using (advertiser_id = auth.uid()) with check (advertiser_id = auth.uid());
create policy campaigns_shop_read on campaigns for select
  using (id in (select campaign_id from approvals where shop_id in (select my_shop_ids())));

-- approvals: the advertiser creates them at booking and reads them; the shop
-- reads and decides its own.
create policy approvals_advertiser_read on approvals for select
  using (campaign_id in (select id from campaigns where advertiser_id = auth.uid()));
create policy approvals_advertiser_insert on approvals for insert
  with check (campaign_id in (select id from campaigns where advertiser_id = auth.uid()));
create policy approvals_shop_read on approvals for select
  using (shop_id in (select my_shop_ids()));
create policy approvals_shop_decide on approvals for update
  using (shop_id in (select my_shop_ids())) with check (shop_id in (select my_shop_ids()));

-- devices: owners see and rename their TVs; pairing writes go through api/.
create policy devices_owner_read on devices for select using (shop_id in (select my_shop_ids()));
create policy devices_owner_update on devices for update
  using (shop_id in (select my_shop_ids())) with check (shop_id in (select my_shop_ids()));

-- plays: advertisers read delivery for their campaigns; shops read plays on
-- their own TVs. Only api/ inserts.
create policy plays_advertiser_read on plays for select
  using (campaign_id in (select id from campaigns where advertiser_id = auth.uid()));
create policy plays_shop_read on plays for select
  using (device_id in (select id from devices where shop_id in (select my_shop_ids())));
