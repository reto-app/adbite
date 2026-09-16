# AdBite build plan

Written 2026-09-16, after the Roku demo on the Hisense. This is the order of
work to turn the demo into a product: accounts, a board that reaches TVs on its
own, ads that get booked, approved, delivered and billed.

## Decisions already made

- **Supabase** for auth and Postgres. **Cloudflare R2** for every file a TV
  downloads (creatives, posters, reels) behind `assets.adbite.site`: S3 API,
  no egress charge, Cloudflare cache in front so a reel is pulled from the
  bucket once however many TVs fetch it. Supabase Storage and S3 both bill
  egress, and egress is the only storage cost that grows with the fleet.
- **Vercel functions** in `api/` stay as the HTTP layer (the site already
  deploys there and `api/lead.ts` proves the runtime). They talk to Supabase
  with the service key; the browser talks to Supabase directly for auth and
  for reads that RLS can police.
- **Stripe** for advertiser cards, weekly charges and shop payouts. Keys exist;
  wired in phase 5.
- **Nothing streams.** Every video and image a TV shows is downloaded to the
  device first and played from local storage. A board is not switched to a new
  asset set until every asset in it has landed and verified.
- **TVs poll every 10 minutes**, one request, conditional. Dashboard copy says
  "Your TV picks up changes within 10 minutes." No push, no sockets.
- **One universal channel package.** No zip per shop. The baked-in board is a
  pairing screen; everything after that arrives over the network.
- The Roku board format in `roku/board.json` is the wire format. The server
  produces it; the channel keeps reading it unchanged.

## Phase 1: accounts and a real store (site)

**Status 2026-09-16: built and tested locally.** Project `adbite` created in a
new AdBite org, migrations 0001–0003 applied, magic-link sign-in, side
choice, board write-through with version bumps, booking → per-shop approvals
→ approve, and RLS isolation all verified with real sessions. Vercel env vars set for all environments; Resend domain verified, auth mail
through Resend with the branded template, product mail (`lib/email/`,
`api/notify.ts`) delivering from a preview deployment. Not yet: committed
and promoted to production. `lib/network.ts` venues stay static for now; a shop is
placed on the network by setting `shops.venue_id`.

Goal: the dashboard stops being `localStorage`. Two people on two laptops see
the same shop and the same campaigns.

Supabase schema (`supabase/migrations/0001_init.sql`):

```
accounts      id (auth.users), role advertiser|shop, stripe_customer_id, stripe_account_id, created_at
shops         id, owner_id, name, address, lat, lng, hours jsonb, ad_share numeric, ad_layout text, created_at
boards        shop_id pk, board jsonb, version int, updated_at
devices       id, shop_id null, pair_code, secret, name, last_seen, channel_version, etag_served, assets_state jsonb
campaigns     id, advertiser_id, name, format, venues uuid[], dayparts text[], ages text[], weekly_spend,
              creative_id, status in_review|approved|rejected|live|paused|ended, starts_on, ends_on, created_at
creatives     id, advertiser_id, kind image|video, storage_path, bytes, sha256, width, height, seconds, poster_path, ready bool
approvals     campaign_id, shop_id, status pending|approved|rejected, decided_at, note
plays         id, device_id, campaign_id, played_at, seconds
```

RLS: shop owners read/write their own shop, board, devices, approvals.
Advertisers read/write their own campaigns and creatives, read shops (public
fields). Devices never use Supabase directly; they hit `api/` with their secret.

Site changes:

- `lib/supabase.ts`: browser client. `lib/auth.ts` becomes Supabase Auth
  (magic link, plus password for advertisers who want one). `useSession()`
  keeps its `ready: false` first-paint contract so the prerender still works.
- `lib/campaigns.ts`, `lib/board.ts`: same exported shapes, backed by tables
  instead of `adbite.campaigns` / `adbite.board`. Sample campaigns stay
  client-side and are never written to the database.
- `lib/network.ts`: stays static this phase. `shops.venue_id` maps a signed-up
  shop onto its entry; the dynamic venue list is phase 3 work.
- Sign-in split (`/signin`) creates the account with a role; a shop signup
  also creates its `shops` and `boards` rows.

Deliverable: the dashboard round-trips through Supabase; `localStorage` holds
only per-browser conveniences.

## Phase 2: the board reaches a TV by itself (site + channel)

**Status 2026-09-16: working end to end on the Hisense.** The universal
package showed a pairing code, the code was typed into the dashboard's Your
TVs tab, and within a minute the TV was drawing Bao Pao Wow's board with a
video spot downloaded from R2 and played from `cachefs:`. Register → pair →
compose → etag 304 → plays all verified. Still open: watching a menu edit
land through the ten-minute poll (the hotspot went down mid-test), and the
`cachefs:` capacity figure, which the channel now prints to the log on every
board change. **This TV blocks ECP keypresses** (Settings → System →
Advanced → Control by mobile apps), so the OPTIONS overlay can only be
checked with the physical remote.

Goal: pair a TV from the dashboard, edit the menu, see it on the wall within
10 minutes, with no laptop involved.

Server:

- `api/device/sync.ts` (POST, auth by device secret). Body: `{etag, plays[],
  channelVersion, assets: {path: sha}}`. Records `last_seen`, inserts plays,
  then composes the board for that device's shop: the `boards.board` JSON,
  `slotWindows` from shop hours, `ads[]` from approved campaigns targeting this
  shop and in flight this week, each `src` an absolute `assets.adbite.site`
  URL plus `sha256` and `bytes`. Response is `{unchanged: true}` when the etag
  matches, otherwise the board with a new etag. One request per 10 minutes
  carries everything the TV has to say and hear.
- `api/device/pair.ts`: dashboard posts a six-character code; the matching
  unpaired device row gets `shop_id`, the response tells the TV on its next
  sync to switch from the pairing screen to the board.
- Board composition lives in `lib/compose.ts` so the dashboard preview and the
  TV get the same function.

Channel (`roku/`):

- Pairing screen: baked-in board is a full-screen card with the device code
  and "Enter this code at adbite.site/tv". Device id and secret are generated
  on first launch and kept in the registry.
- `ConfigTask` moves from GET to the sync POST, `refreshMinutes: 10`, keeps
  the ETag flow. `refreshAt` stays as the daily full refresh.
- Asset downloader: for every `src` in the incoming board, if `cachefs:/<sha>`
  is missing or the wrong length, `roUrlTransfer.AsyncGetToFile` into
  `cachefs:`, verify length, then rewrite the board's `src` to the local path.
  The board is only handed to the scene once every asset is local. The
  previous board keeps playing meanwhile. `AdPane` already accepts `cachefs:`
  paths (`resolveSrc`).
- Storage budget test on the Hisense first: write 80 MB of files to
  `cachefs:`, reboot, see what survives. This sets the per-device asset cap
  the composer enforces. If `cachefs:` evicts, fall back to re-downloading on
  launch and cap video creatives harder.
- Dashboard "TVs" panel: each device's name, last seen, channel version,
  whether its assets are current. Copy: "Your TV picks up changes within 10
  minutes."

Deliverable: Bao Pao Wow paired, menu edited on the site, shows on the TV.

## Phase 3: ads get booked, approved and delivered (site)

**Status 2026-09-16: built.** Uploads go to R2 by signed PUT and are
size-checked server-side before a creative is playable; the builder accepts
PNG/JPG/WEBP and MP4 with a progress bar; the shop's queue plays the real
creative; delivery figures read the play log (`lib/plays.ts`) and fall back
to the model only until a screen reports. Open: the R2 CORS policy (needs a
dashboard click, see SETUP.md) and video transcoding, which is phase 4.

Goal: an advertiser books, the shop approves in their dashboard, the creative
is on the shop's TV the next sync.

- Creative upload goes to R2 by presigned PUT from `api/uploads.ts`, with a
  server-side check: images ≤ 2 MB PNG/JPG at the format's aspect; video ≤ 15 s
  MP4. Video is transcoded to what the Roku wants (H.264 High 4.1, yuv420p,
  1080p30, `+faststart`, ≤ 4 MB) by the render worker (phase 4) before
  `ready = true`; until then the campaign cannot be approved.
- Booking writes `campaigns` + one `approvals` row per venue, status
  `pending`. Shop dashboard gets an approvals queue with the preview the
  advertiser saw. Approve → `approved`; the composer includes it.
- Advertiser dashboard reads `plays` for delivery numbers, replacing the dash.
- Email on booking, approval and rejection: done in phase 1 (`lib/email/`,
  `api/notify.ts`).

Deliverable: an ad booked on the site is on the TV within 10 minutes of the
shop approving it, played from local storage.

## Phase 4: render worker (video without streaming)

**Status 2026-09-16: built, awaiting migration and Fly deployment.** The
worker, queue, reel triggers, and device composition are in this repository;
the required one-time deployment commands are in `SETUP.md`.

Goal: video creatives and stitched reels, produced server-side, delivered as
files.

- A small always-on machine on Fly (same account as Hypertrade) running
  `ffmpeg`, polling a `render_jobs` table in Supabase: `transcode` (creative
  → Roku-safe MP4 + poster) and `reel` (ordered list of assets → one stitched
  MP4 with 0.5 s dissolves, exactly what `tools/` did by hand for the Mexico
  reel). Output goes back to R2; the job row carries status and error.
- Supplemental screens: a `screens` flag on the device (`menu` or `reel`).
  For `reel` the composer emits a single `loop: true` video (the channel
  already supports `supplemental`, `chain`, `loop`) and enqueues a reel job
  whenever the shop's approved set changes. The TV downloads one file when
  its sha changes, plays it looped, nothing streams.
- Reel size stays under the device cap from the phase 2 test (the 145 s
  Mexico reel was 42 MB at CRF 22; CRF 25 roughly halves it).

## Phase 5: money (Stripe)

**Status 2026-09-16: built, awaiting migration and Stripe/Vercel configuration.**
Checkout setup sessions and signed webhook promotion gate a campaign before it
can reach a TV. The Monday billing job tallies device plays against the rate
card in each shop's time zone, charges advertisers off-session once per week,
pauses campaigns and mails the advertiser when collection fails, and transfers
the recorded share only after the charge succeeds. Connect recipient onboarding
uses Accounts v2; the dashboard now reads its charges and payouts from the
auditable ledger.

- Advertiser: Stripe Checkout in `setup` mode at booking; payment method
  saved to the customer. Campaign is `in_review` until a card is on file.
- Weekly charge: a Vercel cron on Monday tallies last week's `plays` per
  campaign with `lib/pricing.ts` (video per play, others per minute, peak vs
  off-peak by `played_at`) and creates one off-session PaymentIntent per
  advertiser. Failure pauses their campaigns and emails them.
- Shops: Stripe Connect Express onboarding link from the dashboard; the same
  cron transfers `SHOP_SHARE` × each venue's revenue. `SHOP_SHARE` stays
  unexported.
- Webhooks in `api/stripe/webhook.ts`: `payment_intent.*`, `account.updated`.
- Advertiser and shop dashboards get a statement page reading from Stripe.

## Phase 6: Channel Store (filed during phase 2)

The review takes two to four weeks, so this starts the day the pairing screen
exists, not at the end.

- Roku developer account (free for a non-monetized channel). Generate the
  signing key on the Hisense (`genkey` on the debug console) and package from
  the dev web UI. The key and its password sign every future update; they go
  in the password manager, never the repo.
- Portal listing: name, category, description, 540x405 poster, 1920x1080
  screenshots, content rating, and a privacy-policy page on the site.
- Certification prep in the channel: FHD icon set alongside the HD one, Back
  exits cleanly from every screen, remote-key mashing on the pairing screen
  does nothing bad, launch stays fast on Roku's low-end reference box. The
  keep-awake pixel video comes out of the Store build; the shop setup
  instructions say to disable the TV's screensaver in Settings instead.
- Reviewer path: a fixed pairing code that resolves to a seeded demo shop,
  so Roku can see the channel work without an account. Same code path as
  real pairing.
- Until it lands, installs are sideloads with `tools/deploy.sh` and each TV
  needs Fast TV Start on. Beta channels expire after 120 days and are not the
  answer.

## Order and rough effort

| Phase | Depends on | Effort |
| --- | --- | --- |
| 1 Accounts and store | Supabase project | 2–3 days |
| 2 Board to TV | 1 | 3–4 days, half of it channel work |
| 3 Booking and approval | 1, 2 | 2–3 days |
| 4 Render worker | Fly app | 2 days |
| 5 Stripe | 1, 3 | 3 days |
| 6 Channel Store | 2 | 1 day of work, weeks of waiting |

Phases 1 → 2 → 3 in order; 6 is filed the day phase 2's pairing screen works;
4 can run alongside 3; 5 after 3.

## What is needed to start

- A Supabase project: its URL, anon key and service key, or `supabase login`
  on this machine and the project ref. Phase 1 starts the moment these exist.
- A Cloudflare account with R2 enabled: an API token with R2 read/write, and
  `assets.adbite.site` pointed at the bucket. Needed in phase 2 for the first
  asset download, so it can wait a few days.
- A Roku developer account, created by whoever will own the channel listing.
- Stripe keys at phase 5 (test keys first).
- Fly at phase 4: `fly auth` on this machine is enough.
- The Hisense on the hotspot for the phase 2 storage test and end-to-end run.
