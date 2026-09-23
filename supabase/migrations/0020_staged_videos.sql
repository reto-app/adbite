-- The shop's own film, cut to the pane it actually plays in.
--
-- Most screens we sell are a display board: no prices, the shop's film on a
-- loop, and the strip along the foot is the part that is sold. The film
-- therefore does not get the whole screen -- it gets the screen less the
-- strip -- and a file made for the whole screen sits inside that pane with
-- black bars down two sides. On the board shape we sell most, the shop's own
-- footage was the thing that looked broken.
--
-- So a staged copy is cut per pane: scaled up until it covers and then
-- cropped, the way the channel's Poster already draws a still
-- (scaleToZoom). Cropping rather than padding is deliberate. It is the
-- shop's own material on the shop's own screen, and a shop would rather lose
-- an inch off the top of their taco than hang bars on their wall. An
-- advertiser's spot is not treated this way: turned_videos still pads, because
-- cutting somebody's paid artwork is not ours to do.
--
-- Keyed by the pane as well as the direction, because a shop that moves its
-- ads from the foot to the right-hand rail has changed the shape of the pane
-- and needs a different cut of the same source.

create table staged_videos (
  source_path text not null,
  -- 'none' for a screen hung the usual way round; the panel does the
  -- rotating on the other two, so the file comes out with its sides swapped.
  turn text not null check (turn in ('none', 'left', 'right')),
  -- The pane in canvas space: 1920x1080 for a landscape board, 1080x1920 for
  -- one on its end, less whatever the strip takes. lib/compose.ts's
  -- stageFrame() is the one place these are worked out.
  fit_width integer not null,
  fit_height integer not null,
  storage_path text not null,
  sha256 text not null,
  bytes integer not null,
  seconds numeric not null,
  built_at timestamptz not null default now(),
  primary key (source_path, turn, fit_width, fit_height)
);
alter table staged_videos enable row level security;
-- Read by the sync endpoint and written by the worker, both with the service
-- key. No policies, for the same reason turned_videos has none.

alter table render_jobs add column fit_width integer;
alter table render_jobs add column fit_height integer;
alter table render_jobs drop constraint render_jobs_kind_check;
alter table render_jobs add constraint render_jobs_kind_check
  check (kind in ('transcode', 'reel', 'transcode_media', 'turn', 'stage'));

-- The 'turn' column is checked against ('left','right') and a staged job for
-- a landscape board has neither, so it carries 'none'.
-- Added inline in 0017, so the name is Postgres's own. `if exists` because
-- an inline check's generated name is a convention rather than a promise.
alter table render_jobs drop constraint if exists render_jobs_turn_check;
alter table render_jobs add constraint render_jobs_turn_check
  check (turn is null or turn in ('none', 'left', 'right'));

-- One cut per source per pane, however many screens ask before the worker
-- gets there.
create unique index render_jobs_one_active_stage
  on render_jobs (source_path, turn, fit_width, fit_height)
  where kind = 'stage' and status in ('queued', 'running');

create or replace function enqueue_stage_job(
  path text, direction text, width integer, height integer, max_seconds numeric
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if path is null or direction is null or width is null or height is null then return; end if;
  insert into render_jobs (kind, source_path, turn, fit_width, fit_height, max_seconds)
    values ('stage', path, direction, width, height, max_seconds)
    on conflict do nothing;
end $$;
revoke execute on function enqueue_stage_job(text, text, integer, integer, numeric) from public;
grant execute on function enqueue_stage_job(text, text, integer, integer, numeric) to service_role;
