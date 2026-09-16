-- A shop owner has to see the artwork before they can approve it, and the
-- artwork row belongs to the advertiser. This opens exactly the creatives a
-- shop has been asked to decide on, and nothing else.

create function creative_ids_for_my_shops() returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.creative_id
  from campaigns c
  join approvals a on a.campaign_id = c.id
  where a.shop_id in (select my_shop_ids()) and c.creative_id is not null
$$;

create policy creatives_shop_read on creatives for select
  using (id in (select creative_ids_for_my_shops()));
