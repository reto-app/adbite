-- Media the shop owns, as opposed to advertising it was paid to carry.
--
-- Not every board is a menu. A juice bar runs a looping film of the fruit, a
-- barber runs price cards and a highlight reel, a gym runs class times over
-- b-roll. That footage is the shop's own: it is never approved by anyone, it
-- is never billed to anyone, and it mixes into the same rotation as the ads
-- so a board reads as one thing rather than as a menu with adverts bolted on.
--
-- It is deliberately not a row in `creatives`. A creative belongs to an
-- advertiser, is approved by a shop and is charged for; this is the opposite
-- of all three, and the only thing the two share is a file in a bucket.

create table shop_media (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('image', 'video')),
  storage_path text,
  sha256 text,
  bytes integer,
  width integer,
  height integer,
  seconds numeric,
  poster_path text,
  -- How long a still is held. Video uses its own length.
  hold_seconds integer not null default 12,
  ready boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index shop_media_shop on shop_media (shop_id, position);

alter table shop_media enable row level security;
create policy shop_media_owner_all on shop_media for all
  using (shop_id in (select my_shop_ids()))
  with check (shop_id in (select my_shop_ids()));

-- The render worker transcodes a shop's footage exactly as it does an
-- advertiser's: a Roku is no more forgiving about one than the other.
alter table render_jobs add column shop_media_id uuid references shop_media (id) on delete cascade;
alter table render_jobs drop constraint render_jobs_kind_check;
alter table render_jobs add constraint render_jobs_kind_check
  check (kind in ('transcode', 'reel', 'transcode_media'));
