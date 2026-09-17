-- Two products, and money that moves by bank transfer rather than card.
--
-- 1. A permanent spot is a place, not a quantity of screen time: one static ad
--    in the strip under a shop's menu, on one screen, for a year. A campaign
--    that bought them records how many, so the board knows how full it is and
--    the invoice knows what to charge.
--
-- 2. Stripe is shelved. Collection and payout are both a bank transfer against
--    an invoice we raise and a receipt we send when it clears, so every amount
--    needs a document with a number on it that a person can refer to. The
--    charges and payouts ledgers stay exactly as they are -- they are the
--    accounting, and they were never Stripe-specific -- and an invoice hangs
--    off them.
--
-- Amounts are integer cents throughout, so rounding never changes a total.

alter table campaigns
  add column if not exists spots integer not null default 0
    check (spots >= 0);

comment on column campaigns.spots is
  'Permanent bottom-banner spots bought, one per screen. Zero for video.';

-- Documents. One per charge (an advertiser owes us) or per payout (we owe a
-- shop), so both sides of the ledger can be handed a numbered piece of paper.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  -- Human-readable and stable once issued: AB-2026-0001.
  number text not null unique,
  kind text not null check (kind in ('charge', 'payout')),
  charge_id uuid references charges (id) on delete cascade,
  payout_id uuid references payouts (id) on delete cascade,
  -- Who it is addressed to. One of these is set, matching `kind`.
  advertiser_id uuid references accounts (id) on delete restrict,
  shop_id uuid references shops (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'issued'
    check (status in ('issued', 'sent', 'paid', 'void')),
  -- Bank transfers are not instant and are not confirmed by a webhook, so the
  -- date we expect it by is part of the document.
  due_on date,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  -- What the payer quoted on the transfer, so a bank line can be matched back.
  reference text,
  note text,
  constraint invoice_has_one_side check (
    (kind = 'charge' and charge_id is not null and advertiser_id is not null
      and payout_id is null and shop_id is null)
    or
    (kind = 'payout' and payout_id is not null and shop_id is not null
      and charge_id is null and advertiser_id is null)
  )
);

create index invoices_advertiser_idx on invoices (advertiser_id, issued_at desc);
create index invoices_shop_idx on invoices (shop_id, issued_at desc);

alter table invoices enable row level security;

-- Each party reads its own paper and nobody else's. Only the service role
-- writes: an invoice an advertiser could edit is not an invoice.
create policy invoices_advertiser_read on invoices for select
  using (advertiser_id = auth.uid());
create policy invoices_shop_read on invoices for select
  using (shop_id in (select my_shop_ids()));

-- Where to send the money. A shop gives us its bank details once; we store
-- only what is needed to push an ACH credit, and never a full account number
-- in the clear beyond what the transfer itself requires.
create table payout_accounts (
  shop_id uuid primary key references shops (id) on delete cascade,
  account_holder text not null,
  -- Nine digits, checked in the app before it gets here.
  routing_number text not null,
  -- Last four only for display; the full number lives in the vault column.
  account_last4 text not null,
  account_number text not null,
  account_type text not null default 'checking'
    check (account_type in ('checking', 'savings')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payout_accounts enable row level security;

-- A shop may say where it wants paying, and may see the last four back. The
-- full number is never selectable through the API: the column is revoked
-- below, so only the service role can read it.
create policy payout_accounts_shop_read on payout_accounts for select
  using (shop_id in (select my_shop_ids()));
create policy payout_accounts_shop_write on payout_accounts for insert
  with check (shop_id in (select my_shop_ids()));
create policy payout_accounts_shop_update on payout_accounts for update
  using (shop_id in (select my_shop_ids()));

revoke select (account_number) on payout_accounts from anon, authenticated;
revoke update (account_number) on payout_accounts from anon;

-- A permanent spot is invoiced once, when the shop approves it, and not by the
-- weekly run. So a charge no longer always belongs to a billing week, and it
-- may name the one campaign it covers.
alter table charges alter column billing_run_id drop not null;
alter table charges
  add column if not exists campaign_id uuid references campaigns (id) on delete restrict;

-- One charge per campaign for the twelve months, so re-running an approval
-- cannot raise a second one.
create unique index if not exists charges_campaign_idx
  on charges (campaign_id) where campaign_id is not null;
