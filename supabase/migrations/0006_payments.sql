-- Stripe is the processor; these rows are the product's auditable ledger.
-- Amounts are integer cents so rounding never changes a charge or payout.

create table billing_runs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  created_at timestamptz not null default now(),
  unique (week_start, week_end)
);

create table charges (
  id uuid primary key default gen_random_uuid(),
  billing_run_id uuid not null references billing_runs (id) on delete cascade,
  advertiser_id uuid not null references accounts (id) on delete restrict,
  stripe_payment_intent_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (billing_run_id, advertiser_id)
);

create table charge_lines (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references charges (id) on delete cascade,
  campaign_id uuid not null references campaigns (id) on delete restrict,
  shop_id uuid not null references shops (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  payout_cents integer not null check (payout_cents >= 0),
  unique (charge_id, campaign_id, shop_id)
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references charges (id) on delete cascade,
  shop_id uuid not null references shops (id) on delete restrict,
  stripe_transfer_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (charge_id, shop_id)
);

alter table billing_runs enable row level security;
alter table charges enable row level security;
alter table charge_lines enable row level security;
alter table payouts enable row level security;

create policy charges_advertiser_read on charges for select using (advertiser_id = auth.uid());
create policy charge_lines_advertiser_read on charge_lines for select using
  (charge_id in (select id from charges where advertiser_id = auth.uid()));
create policy payouts_shop_read on payouts for select using
  (shop_id in (select my_shop_ids()));
create policy charge_lines_shop_read on charge_lines for select using
  (shop_id in (select my_shop_ids()));
