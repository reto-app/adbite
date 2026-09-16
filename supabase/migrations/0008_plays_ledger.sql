-- Which charge collected a play, so a week that is too small to bill can be
-- carried into the next one instead of being lost or billed twice.
--
-- Stripe will not take a payment under fifty cents, and this rate card is
-- priced in fractions of one: a quiet week for a single advertiser can total
-- less than that. Without somewhere to record "billed", the only options are
-- to drop those plays or to charge an amount Stripe rejects, and a rejected
-- charge reads to an advertiser as a failed payment they have to fix.

alter table plays add column charge_id uuid references charges (id) on delete set null;

-- The weekly run asks for exactly this: plays nobody has collected yet.
create index plays_unbilled on plays (played_at) where charge_id is null;
