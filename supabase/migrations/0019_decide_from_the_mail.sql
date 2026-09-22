-- A shop can decide from the mail, without signing in first.
--
-- The approval mail used to land a shop owner on /dashboard, which is a sign-in
-- form unless the session on that device happens to be live. A shop owner reads
-- that mail on a phone, once, standing behind a counter; asking them to find a
-- password before they can say yes to ninety dollars a week is how a queue goes
-- stale. So the mail now carries a link that stands in for the sign-in.
--
-- The token is minted per approval row -- one per shop per campaign, which is
-- one per mail -- and only its hash is stored, the same way a device pairing
-- secret is handled in lib/server/db.ts. A dump of this table therefore does not
-- hand anybody the ability to decide on a booking.
--
-- What the token authorises is deliberately narrow: read this one campaign, and
-- set this one approval row. It is not a session, it does not sign anybody in,
-- and it can do nothing to any other row the owner's account can reach. That is
-- the whole reason it is a separate secret rather than a Supabase magic link,
-- which would be a full session delivered by mail.
--
-- It stops working once the row is decided, so a forwarded mail cannot flip an
-- answer somebody already gave, and it expires regardless. Thirty days is long
-- against the day or two a shop usually takes and short against the life of an
-- inbox.

alter table approvals
  add column if not exists link_hash text,
  add column if not exists link_made_at timestamptz;

comment on column approvals.link_hash is
  'sha256 of the secret in the approval mail. Never the secret itself.';
comment on column approvals.link_made_at is
  'When that secret was minted. It is good for LINK_DAYS from here, and only while status is pending.';

-- The lookup every visit from the mail does, and the only one: hash in hand,
-- find the row. Unique so a repeat mint cannot leave two rows answering to one
-- secret, and partial so the decided rows -- which is eventually most of them --
-- stay out of it.
create unique index if not exists approvals_link_hash
  on approvals (link_hash)
  where link_hash is not null;

-- No row-level-security policy is added here on purpose. Deciding by token runs
-- in api/queue/review.ts under the service key, which bypasses RLS, and that
-- function does its own authorisation against the hash and the expiry. The
-- browser still reaches approvals only through the existing shop and advertiser
-- policies, and neither of them selects these two columns for anybody: the
-- secret is not in the page payload, so it cannot leak into one.
revoke select (link_hash, link_made_at) on approvals from anon, authenticated;
