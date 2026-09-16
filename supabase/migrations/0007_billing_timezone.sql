-- A play is recorded in UTC; pricing has to be evaluated in the screen's
-- local time. Existing pilot shops are in Utah, so this safe default preserves
-- their current rate card until a shop is configured otherwise.
alter table shops add column timezone text not null default 'America/Denver';

-- Stripe retries webhooks. Keeping the event id makes each state transition
-- exactly once even when Stripe delivers the same signed event again.
create table stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table stripe_events enable row level security;
