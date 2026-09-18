-- Who the account actually is.
--
-- Until now an account was an email address and a role, which was enough while
-- Stripe held the customer record and the only thing we sent anyone was a
-- magic link. Two things changed that:
--
--   1. Money moves by bank transfer against an invoice we raise. An invoice
--      needs a legal name and a postal address to be addressed to; "to:
--      sam@ironrosegym.com" is a receipt for nobody.
--
--   2. A shop owner decides whether to put a business on their wall. They were
--      shown an email address to decide on. A name and a website is the least
--      they need to make that call honestly.
--
-- So both sides answer the same short set of questions once, at signup, and
-- the answers live here rather than in a form we email ourselves.
--
-- Split on purpose: `accounts` is who you are and where paper goes, which is
-- identical for both sides. `shops` is what the screen is and where it hangs,
-- which only a shop has.

alter table accounts
  add column if not exists business_name text,
  add column if not exists contact_name text,
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'US',
  -- Null until the questions have been answered. The dashboard asks until it
  -- is set, which is why it is a timestamp rather than a boolean: we want to
  -- know when, not just whether.
  add column if not exists onboarded_at timestamptz;

comment on column accounts.business_name is
  'Legal or trading name. This is who an invoice is addressed to.';
comment on column accounts.onboarded_at is
  'Set when the business details were first completed. Null blocks the dashboard.';

alter table shops
  add column if not exists website text,
  add column if not exists phone text,
  -- What sort of shop, in the owner's own words: "Filipino steamed buns",
  -- "Third-wave espresso bar". Shown to advertisers next to the board.
  add column if not exists kind text,
  add column if not exists screens integer not null default 1
    check (screens > 0),
  add column if not exists days_open integer not null default 7
    check (days_open between 1 and 7);

-- A shop is bookable only once it is placed on the network, which is a thing
-- we do by hand while the venue list is static. `venue_id` already carries
-- that; this makes the waiting state explicit rather than leaving the owner
-- staring at an approval queue that can never fill.
comment on column shops.venue_id is
  'Which entry in lib/network.ts this shop is. Null means signed up but not yet
   placed on the network: no advertiser can target it and no approval row will
   ever be written for it, so the dashboard says so instead of showing an
   empty queue.';

-- The advertiser, as the shop deciding on their ad sees them.
--
-- Copied onto the booking rather than joined, for two reasons. Row-level
-- security lets an account read only its own row in `accounts`, and the fix
-- for that would be a policy letting any shop read any advertiser who booked
-- them -- which hands over a postal address and a phone number to answer a
-- question that only needs a name and a website. And a booking should carry
-- the name as it was when it was made, not as it is today.
alter table campaigns
  add column if not exists advertiser_name text,
  add column if not exists advertiser_site text;

comment on column campaigns.advertiser_name is
  'Business name at the time of booking. Shown to the shop in its approval queue.';
