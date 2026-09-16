-- A save from the dashboard moves the board's version; the TV's etag is
-- built from it, so an unchanged menu is never re-sent.
create function bump_board_version(p_shop_id uuid) returns void
language sql security definer set search_path = public as $$
  update boards set version = version + 1 where shop_id = p_shop_id
    and shop_id in (select id from shops where owner_id = auth.uid());
$$;
