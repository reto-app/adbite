-- What is inside a stitched reel, so time spent looping it can be credited
-- to the campaigns it is actually made of.
--
-- A reel plays as one file: the screen reports the minutes it ran, not which
-- spot was on at any instant. Splitting those minutes across the segments in
-- proportion to their length bills each advertiser for its real share of the
-- loop, and the parts always add back up to the time the wall showed.

alter table reels add column segments jsonb not null default '[]'::jsonb;
