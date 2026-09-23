-- Printed QR codes, counted.
--
-- A code on a flyer or in somebody else's ad points at adbite.site/q/<code>,
-- which writes one row here and forwards to the page the code is for. The row
-- is the only record that the paper worked: page views cannot tell a scan from
-- somebody who typed the address, and nothing downstream knows the difference.
--
-- No address is kept. `visitor` is a hash of the address, the browser and the
-- day, which is enough to say "forty scans from thirty-one phones today" and
-- not enough to follow anybody from one day to the next -- the privacy page
-- promises aggregate figures and this keeps to it.
--
-- Link previews and crawlers are written down rather than dropped, flagged
-- `bot`, so a spike can be explained instead of wondered at. The counts leave
-- them out.

create table if not exists qr_scans (
  id bigserial primary key,
  code text not null,
  scanned_at timestamptz not null default now(),
  visitor text not null,
  bot boolean not null default false,
  device text not null default 'other',
  city text,
  region text
);

create index if not exists qr_scans_code_time on qr_scans (code, scanned_at desc);

-- Service key only. api/qr.ts writes and api/qr-stats.ts reads, and nothing in
-- the browser has any business with either.
alter table qr_scans enable row level security;
revoke all on qr_scans from anon, authenticated;
