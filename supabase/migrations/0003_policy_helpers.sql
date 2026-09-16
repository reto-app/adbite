-- campaigns' shop-read policy looked into approvals, and approvals' policies
-- looked back into campaigns, which Postgres refuses as recursion. Both
-- lookups move into security-definer helpers that read the tables directly.

create function my_campaign_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from campaigns where advertiser_id = auth.uid()
$$;

create function campaign_ids_for_my_shops() returns setof uuid
language sql stable security definer set search_path = public as $$
  select campaign_id from approvals where shop_id in (select my_shop_ids())
$$;

drop policy campaigns_shop_read on campaigns;
create policy campaigns_shop_read on campaigns for select
  using (id in (select campaign_ids_for_my_shops()));

drop policy approvals_advertiser_read on approvals;
create policy approvals_advertiser_read on approvals for select
  using (campaign_id in (select my_campaign_ids()));

drop policy approvals_advertiser_insert on approvals;
create policy approvals_advertiser_insert on approvals for insert
  with check (campaign_id in (select my_campaign_ids()));

drop policy plays_advertiser_read on plays;
create policy plays_advertiser_read on plays for select
  using (campaign_id in (select my_campaign_ids()));
