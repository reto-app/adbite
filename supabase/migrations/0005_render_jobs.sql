-- Work that needs ffmpeg, and the files it produces.
--
-- A Vercel function cannot transcode video: no binary, a four-megabyte body
-- limit, and a clock that runs out. So the site writes a job and a small
-- always-on machine does the work and writes back. Nothing in the product
-- waits on it: a creative is simply not playable until its job is done.

create table render_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('transcode', 'reel')),
  -- transcode: the creative to re-encode. reel: the shop to build for.
  creative_id uuid references creatives (id) on delete cascade,
  shop_id uuid references shops (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
  ,check (
    (kind = 'transcode' and creative_id is not null and shop_id is null)
    or (kind = 'reel' and shop_id is not null and creative_id is null)
  )
);
create index render_jobs_queue on render_jobs (status, created_at);
-- The browser may retry its completion request. A creative only ever needs
-- one transcode; retries are handled by that job's attempts counter.
create unique index render_jobs_one_transcode
  on render_jobs (creative_id) where kind = 'transcode';
-- Only one active rebuild per shop. If its input changes while it is running,
-- the worker reads the latest input; if it has already finished, a new row is
-- queued by the trigger below.
create unique index render_jobs_one_active_reel
  on render_jobs (shop_id) where kind = 'reel' and status in ('queued', 'running');

-- One reel per shop: every approved spot stitched into a single file a
-- second screen can loop without ever re-opening anything.
create table reels (
  shop_id uuid primary key references shops (id) on delete cascade,
  storage_path text not null,
  sha256 text not null,
  bytes integer not null,
  seconds numeric not null,
  -- Hash of the creative ids this was built from; the worker rebuilds when
  -- the shop's approved set stops matching it.
  built_from text not null,
  built_at timestamptz not null default now()
);

alter table render_jobs enable row level security;
alter table reels enable row level security;

-- Advertisers watch their own transcodes so the builder can say "processing".
create policy render_jobs_advertiser_read on render_jobs for select
  using (creative_id in (select id from creatives where advertiser_id = auth.uid()));
create policy render_jobs_shop_read on render_jobs for select
  using (shop_id in (select my_shop_ids()));
create policy reels_shop_read on reels for select
  using (shop_id in (select my_shop_ids()));

-- The worker takes one job at a time and no two workers take the same one.
create function claim_render_job() returns render_jobs
language plpgsql security definer set search_path = public as $$
declare
  claimed render_jobs;
begin
  select * into claimed from render_jobs
    where status = 'queued' and attempts < 3
    order by created_at
    for update skip locked
    limit 1;
  if not found then return null; end if;

  update render_jobs
    set status = 'running', attempts = attempts + 1, started_at = now()
    where id = claimed.id
    returning * into claimed;
  return claimed;
end $$;

-- Queue a rebuild without making a stack of identical jobs. This is used by
-- both the change triggers and the worker's periodic repair scan.
create function enqueue_reel_job(target_shop_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target_shop_id is null then return; end if;
  insert into render_jobs (kind, shop_id)
    values ('reel', target_shop_id)
    on conflict do nothing;
end $$;

create function queue_reel_for_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(coalesce(new.shop_id, old.shop_id));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger approvals_queue_reel
  after insert or update of status or delete on approvals
  for each row execute function queue_reel_for_approval();

create function queue_reels_for_campaign() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(a.shop_id)
  from approvals a
  where a.campaign_id = coalesce(new.id, old.id);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger campaigns_queue_reel
  after update of status, creative_id or delete on campaigns
  for each row execute function queue_reels_for_campaign();

create function queue_reels_for_creative() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(a.shop_id)
  from campaigns c join approvals a on a.campaign_id = c.id
  where c.creative_id = new.id;
  return new;
end $$;

create trigger creatives_queue_reel
  after update of ready, storage_path, seconds on creatives
  for each row execute function queue_reels_for_creative();

-- SECURITY DEFINER functions otherwise default to executable by every role.
revoke execute on function claim_render_job() from public;
revoke execute on function enqueue_reel_job(uuid) from public;
grant execute on function claim_render_job() to service_role;
grant execute on function enqueue_reel_job(uuid) to service_role;
