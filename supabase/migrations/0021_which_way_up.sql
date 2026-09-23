-- Which way up a screen is hung, as a fact about the screen.
--
-- It used to live only on the board, which is the shop's, so every TV a shop
-- owned was hung the same way by definition. That was true when a shop had
-- one screen and stopped being true as soon as they had two -- a counter
-- board on the wall and a portrait screen beside the till cannot both be
-- described by one field.
--
-- It also made an on-TV control impossible to build safely: somebody
-- pressing a button on one remote would have turned every other screen in
-- the shop. So a device may now carry its own answer, and null means "the
-- board's", which is what every existing row means and keeps meaning.

alter table devices add column orientation text check (orientation in ('landscape', 'portrait'));
alter table devices add column turn text check (turn in ('left', 'right'));

comment on column devices.orientation is
  'How this screen is hung. Null takes the board''s, which is the default for a shop with one TV.';
comment on column devices.turn is
  'For a portrait screen, which way it was turned. Null takes the board''s.';
