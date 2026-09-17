-- Rebuild a shop's reel whenever what belongs in it changes.
--
-- These objects were written into 0005 after that migration had already been
-- applied, so they never reached the database: an applied migration is a
-- record of what ran, not a file to keep editing. They are repeated here,
-- with two corrections.
--
-- The first: the original said `on conflict do nothing` to avoid stacking up
-- identical jobs, but nothing on render_jobs was unique, so every trigger
-- queued another row. The partial index below is the constraint that claim
-- needed -- one queued reel per shop, and no index pressure on the finished
-- rows, which are the ones that accumulate.
--
-- The second: a shop's own media belongs in its reel too, so changing it has
-- to rebuild as surely as an approval does.

create unique index render_jobs_one_queued_reel
  on render_jobs (shop_id) where kind = 'reel' and status = 'queued';

create or replace function enqueue_reel_job(target_shop_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target_shop_id is null then return; end if;
  insert into render_jobs (kind, shop_id)
    values ('reel', target_shop_id)
    on conflict do nothing;
end $$;

create or replace function queue_reel_for_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(coalesce(new.shop_id, old.shop_id));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists approvals_queue_reel on approvals;
create trigger approvals_queue_reel
  after insert or update of status or delete on approvals
  for each row execute function queue_reel_for_approval();

create or replace function queue_reels_for_campaign() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(a.shop_id)
  from approvals a
  where a.campaign_id = coalesce(new.id, old.id);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists campaigns_queue_reel on campaigns;
create trigger campaigns_queue_reel
  after update of status, creative_id or delete on campaigns
  for each row execute function queue_reels_for_campaign();

create or replace function queue_reels_for_creative() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(a.shop_id)
  from campaigns c join approvals a on a.campaign_id = c.id
  where c.creative_id = new.id;
  return new;
end $$;

drop trigger if exists creatives_queue_reel on creatives;
create trigger creatives_queue_reel
  after update of ready, storage_path, seconds on creatives
  for each row execute function queue_reels_for_creative();

-- The shop's own half of the reel.
create or replace function queue_reel_for_media() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_reel_job(coalesce(new.shop_id, old.shop_id));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists shop_media_queue_reel on shop_media;
create trigger shop_media_queue_reel
  after insert or update of ready, storage_path, hold_seconds, position or delete on shop_media
  for each row execute function queue_reel_for_media();

-- SECURITY DEFINER functions otherwise default to executable by every role.
revoke execute on function claim_render_job() from public;
revoke execute on function enqueue_reel_job(uuid) from public;
grant execute on function claim_render_job() to service_role;
grant execute on function enqueue_reel_job(uuid) to service_role;
