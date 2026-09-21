-- Video for a screen hung on its end.
--
-- A Roku draws everything rotated except video: the Video node ignores
-- rotation, and always paints its frames the way the panel is wired, which
-- on a TV turned ninety degrees is sideways. So for a portrait board every
-- film -- an advertiser's spot, the shop's own footage, a stitched reel --
-- is rotated in the file by the render worker, and the channel plays that
-- file unrotated into a frame the panel then physically turns upright.
--
-- One turned file per (source, direction). The direction is the shop's: it
-- says which way the TV was turned, and a file turned the wrong way is
-- upside down.

create table turned_videos (
  source_path text not null,
  turn text not null check (turn in ('left', 'right')),
  storage_path text not null,
  sha256 text not null,
  bytes integer not null,
  seconds numeric not null,
  built_at timestamptz not null default now(),
  primary key (source_path, turn)
);
alter table turned_videos enable row level security;
-- Nobody reads this but the sync endpoint and the worker, both with the
-- service key. No policies on purpose.

alter table render_jobs add column source_path text;
alter table render_jobs add column turn text check (turn in ('left', 'right'));
-- How long the turned copy may run: the length its landscape transcode was
-- cut to, so an ad stays an ad's length whichever way the screen is hung.
alter table render_jobs add column max_seconds numeric;
alter table render_jobs drop constraint render_jobs_kind_check;
alter table render_jobs add constraint render_jobs_kind_check
  check (kind in ('transcode', 'reel', 'transcode_media', 'turn'));
-- A file is turned once per direction, however many screens ask for it
-- before the worker gets there.
create unique index render_jobs_one_active_turn
  on render_jobs (source_path, turn) where kind = 'turn' and status in ('queued', 'running');

create or replace function enqueue_turn_job(path text, direction text, max_seconds numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if path is null or direction is null then return; end if;
  insert into render_jobs (kind, source_path, turn, max_seconds)
    values ('turn', path, direction, max_seconds)
    on conflict do nothing;
end $$;
revoke execute on function enqueue_turn_job(text, text, numeric) from public;
grant execute on function enqueue_turn_job(text, text, numeric) to service_role;

-- A reel is built for one way of hanging the screen. The sync endpoint
-- refuses to hand a portrait screen a landscape reel (or the reverse) and
-- falls back to the ordinary rotation until the worker has rebuilt it.
alter table reels add column turn text check (turn in ('left', 'right'));

-- The transcode replaces storage_path with its 1920x1080 output, and a
-- vertical film cropped to landscape cannot be made vertical again. Keep the
-- upload's own key so a portrait screen is turned from the whole picture.
alter table creatives add column original_path text;
alter table shop_media add column original_path text;
