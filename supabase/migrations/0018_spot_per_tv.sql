-- A spot is bought per TV, and for a term.
--
-- Until now a booking named shops. That was true while a shop meant a screen,
-- and it stopped being true the moment a shop hung a second one: a spot is a
-- place in a banner on a wall, and a shop with a board over the counter and
-- another by the door is selling two places, not one. So a booking names the
-- devices it runs on, the same way a piece of the shop's own media already
-- does, and `spots` is how many of them there are.
--
-- Null `device_ids` is every TV the shop has, now and later, which is what
-- every row written before this meant and what a video booking still means:
-- video is time in the rotation rather than a place on a board, so it plays
-- wherever the rotation plays.
--
-- The term is three months or twelve. The price of each is in lib/pricing.ts
-- and the amount actually quoted is written onto the row, because a rate card
-- that changes next year must not change what somebody already agreed to.

alter table campaigns
  add column if not exists device_ids uuid[],
  add column if not exists term text check (term in ('quarter', 'year')),
  add column if not exists amount_cents integer check (amount_cents >= 0);

comment on column campaigns.device_ids is
  'The TVs this booking runs on. Null is every TV the shop has, now and later.';
comment on column campaigns.term is
  'How long a permanent spot was bought for. Null for video, which is metered.';
comment on column campaigns.amount_cents is
  'What was quoted when the booking was made, so a later rate card cannot move it.';

-- One index for the question the device sync asks on every poll: is this
-- campaign on this TV?
create index if not exists campaigns_devices on campaigns using gin (device_ids);
