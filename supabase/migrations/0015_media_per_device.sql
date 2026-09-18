-- Which TVs a piece of the shop's own media plays on.
--
-- Null means every TV the shop has, now and later, which is what every row
-- already meant. An array narrows it: a picture for the counter screen and a
-- film for the one by the door. Ads are not affected; they are placed by
-- the booking, not by this.
alter table shop_media add column device_ids uuid[];
