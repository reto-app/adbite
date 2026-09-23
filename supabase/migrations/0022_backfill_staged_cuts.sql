-- Cut the film for every display board that already exists.
--
-- Without this the first sync after the staged-video deploy finds no cut for
-- any of them, drops the shop's media for a poll or two and leaves the empty
-- menu chrome on the wall while the worker catches up. On the board shape we
-- sell most, that is every screen we have at once.
--
-- The pane is worked out here the same way lib/compose.ts's stageFrame()
-- works it out, which is the same way BoardScene.brs's layout() works it out:
-- the share truncated, never rounded.

do $$
declare
  row record;
  portrait boolean;
  canvas_w integer;
  canvas_h integer;
  share numeric;
  pane_w integer;
  pane_h integer;
  direction text;
begin
  for row in
    select b.shop_id, b.board
    from boards b
    where b.board ? 'adPlacement'
      and b.board ->> 'adPlacement' in ('banner', 'rail')
      -- showsMenu(): a display board never has a menu, nor does one whose
      -- owner uploads their own artwork.
      and (b.board ->> 'kind' = 'display' or b.board ->> 'source' = 'media')
  loop
    portrait := coalesce(row.board ->> 'orientation', 'landscape') = 'portrait';
    canvas_w := case when portrait then 1080 else 1920 end;
    canvas_h := case when portrait then 1920 else 1080 end;
    share := case row.board ->> 'adPlacement' when 'banner' then 0.18 else 1.0 / 3.0 end;
    direction := case when portrait then coalesce(row.board ->> 'turn', 'left') else 'none' end;

    -- There is no rail on a portrait board; the channel draws a strip.
    if portrait or row.board ->> 'adPlacement' = 'banner' then
      pane_w := canvas_w;
      pane_h := canvas_h - trunc(canvas_h * share);
    else
      pane_w := canvas_w - trunc(canvas_w * share);
      pane_h := canvas_h;
    end if;

    -- The upload's own key where we still have it, so a vertical film is not
    -- cut from a copy already cropped to landscape.
    perform enqueue_stage_job(
      coalesce(m.original_path, m.storage_path),
      direction,
      pane_w,
      pane_h,
      coalesce(m.seconds, 15)
    )
    from shop_media m
    where m.shop_id = row.shop_id
      and m.kind = 'video'
      and m.ready
      and coalesce(m.original_path, m.storage_path) is not null;
  end loop;
end $$;
