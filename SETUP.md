# AdBite setup

## Running it locally

```
npm install
npm run dev          # http://localhost:3000
```

**The `api/` directory is served by a dev-only Vite plugin**
(`scripts/dev-api.mjs`, wired into `vite.config.ts`). In production Vercel
finds every `api/**.ts` and routes `/api/<path>` to it as a Node function;
`vinext dev` does not, and without the plugin every `/api` call in development
came back as the app's 404 page -- which is how *every upload in the product*
failed at its first request with "Could not start the upload", along with
leads, notifications, the menu scanner and the device sync a sideloaded Roku
talks to. The plugin bundles each handler with esbuild (Node cannot resolve
the `../lib/server/db.js` spelling these files use) and loads `.env.local`
into `process.env`, which is what Vercel gives the real functions.

If an `/api` call answers with HTML, the plugin is not running: check that
`devApi()` is still first in the plugin list in `vite.config.ts`.

R2's CORS policy has to allow the dev origin as well as the live one -- see
**Artwork storage** below. `http://localhost:3000` is on the list;
`127.0.0.1` and Vercel preview hostnames are not, so a browser upload from
one of those fails at the PUT even though the function worked.

## Supabase (required: accounts, boards, campaigns)

Project `adbite` (ref `uvvjndrdetvvvyrmwhpu`, Oregon), in the AdBite org.
`supabase/migrations` is the schema; apply with `supabase db push`. The repo is
linked to the project (`supabase link`); the database password is in
`.env.local` on the machine that created it.

Set in the Vercel project **and** in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uvvjndrdetvvvyrmwhpu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon key. Safe in the browser; row-level security does the gating. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only, for `api/` functions in later phases. Never `NEXT_PUBLIC_`. |

Sign-in is a magic link. Auth is configured with `site_url`
`https://adbite-local.vercel.app` and an allow-list covering `adbite.site`,
`www.adbite.site`, and `localhost:3000`; add any new domain to the allow-list
(Authentication → URL Configuration) or its links will bounce to the site root.

Auth mail goes out through Resend (SMTP `smtp.resend.com:465`, user `resend`,
password = the API key, sender `hello@adbite.site`), configured on the
project on 2026-09-16. The sign-in template is AdBite's own; regenerate and
push it after editing `lib/email/templates.ts`:

```bash
npx tsx scripts/email-preview.ts --auth > /tmp/auth.json
curl -X PATCH https://api.supabase.com/v1/projects/uvvjndrdetvvvyrmwhpu/config/auth \
  -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
  -H "Content-Type: application/json" --data-binary @/tmp/auth.json
```

(Template edits are refused until custom SMTP is set, which it is.)

## Artwork storage (Cloudflare R2)

Bucket `adbite-assets` on the AdBite Cloudflare account, public behind
`assets.adbite.site`. Uploads go straight from the browser with a signed PUT
from `api/uploads.ts`; the function then checks the object's real size before
marking the creative playable. Objects are keyed by their own SHA-256, which
is also the name a TV gives its local copy.

| Variable | Purpose |
| --- | --- |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | S3 credentials. Object read/write is all they need. |
| `R2_BUCKET` | `adbite-assets` |
| `ASSETS_ORIGIN` | `https://assets.adbite.site`, what the composed board points TVs at. |

**A CORS policy is required for browser uploads**, and an object-scoped API
token cannot set one. In the R2 dashboard, bucket → Settings → CORS policy,
paste:

```json
[
  {
    "AllowedOrigins": [
      "https://adbite.site",
      "https://www.adbite.site",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-checksum-sha256"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Making R2 check the bytes

A signed PUT answering 200 proves only that R2 accepted a request whose
`content-length` matched the signature. The payload is signed as
`UNSIGNED-PAYLOAD`, so nothing on that leg looks at the bytes, and the size
check in `?done=1` compares two numbers the browser supplied. It catches a
transfer that was cut off; it cannot catch one that arrived the right length
and the wrong content. Neither can the channel: `ConfigTask.brs` verifies a
download by size and uses the hash only to name the cached file.

R2 *will* check, if the hash goes in as a signed header. Measured against the
live bucket:

| | default | `R2_CHECKSUM_SHA256=1` |
| --- | --- | --- |
| signed headers | `content-length;host` | `content-length;host;x-amz-checksum-sha256` |
| intact body | 200 | 200 |
| same length, wrong bytes | **200, stored** | **400 BadDigest** |
| header omitted by the client | n/a | 403 SignatureDoesNotMatch |

**Do these two things in this order, or every upload breaks.** A browser
cannot send a header the preflight refuses, and with the current policy the
preflight returns 403 with no `access-control-allow-headers` at all.

1. R2 dashboard → bucket → Settings → CORS policy: add
   `x-amz-checksum-sha256` to `AllowedHeaders` (it is in the block above).
   An object-scoped API token cannot do this, which is why it is a dashboard
   step.
2. Then set `R2_CHECKSUM_SHA256=1` in the Vercel project.

The browser sends whatever `POST /api/uploads` hands back in `uploadHeaders`,
so step 2 is the only code-side switch and there is nothing to deploy.

An object that fails the size check is now deleted rather than left in the
bucket. That matters because the key is the file's own hash and therefore
shared: a truncated upload of a file somebody already uploaded successfully
lands on top of theirs. The delete is skipped if another `ready` row still
points at the same key.

Without it the signed PUT is refused by the browser (the server-side path,
and therefore the seeded demo spot, still works).

## Render worker (Fly)

Videos are not sent to a TV unchanged. Completing an MP4 upload writes a
`transcode` job; the worker makes a muted 1080p30 H.264 file, generates its
poster, and marks the creative ready only after both are in R2. It also builds
one loopable reel for every shop that has a device set to **Ads only (second
screen)**.

Apply the migration before deploying the worker, then create and deploy the
Fly app from the repository root:

```bash
supabase db push
fly launch --config worker/fly.toml --no-deploy
fly secrets set --config worker/fly.toml \
  SUPABASE_URL="https://uvvjndrdetvvvyrmwhpu.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="…" \
  R2_ACCOUNT_ID="…" R2_ACCESS_KEY_ID="…" R2_SECRET_ACCESS_KEY="…" \
  R2_BUCKET="adbite-assets"
fly deploy --config worker/fly.toml
```

The Fly secret values are the same server-side Supabase and R2 credentials
already used by Vercel. Do not set `ASSETS_ORIGIN` there: the worker reads and
writes through R2's S3 endpoint, while only the site and Roku need its public
origin. `fly logs --config worker/fly.toml` shows job failures and retries.

## Putting a screen in a shop

Two settings on the TV itself, both in the shop's hands and neither something
the channel may do for them:

- **Settings → Screen saver → Wait time → Disabled.** A board that blanks
  after ten minutes is not a board. The channel is not allowed to prevent
  this itself; see `docs/ROKU-STORE.md`.
- **Settings → System → Power → Fast TV Start → On.** Without it a Roku TV
  drops its network in standby, so it stops picking up menu changes and
  stops reporting what it played.

Installing the channel is `docs/ROKU-STORE.md`. Until it is in the Store that
means sideloading, which needs the TV and a laptop on one network; after that
it is a search on the TV.

## A shop's own media

Not every board is a menu. A shop is asked once what the screen is for (a
menu, a specials board, or a display screen) and whether they want to type it
here or upload it; the answer is on `boards.board.kind` and `.source` and is
changeable from the board tab.

Their own pictures and film live in `shop_media`, never in `creatives`. A
creative belongs to an advertiser, is approved by a shop and is billed for;
shop media is the opposite of all three, and the only thing the two share is
a bucket. It uploads through the same endpoint with `?for=shop`, is
re-encoded by the render worker exactly as an advertiser's video is, and
mixes into the same rotation so a board reads as one thing.

It is never billed. On an ordinary screen its spots carry an id of
`media-<uuid>`, which is not a campaign id, so the play the channel reports
is dropped. Inside a stitched reel its segments carry no campaign, so they
count toward the whole -- the advertising is billed only for its real share
of the loop -- and are charged to nobody.

**A shop that chose "upload my own" has no menu on the wall.** The composed
board is `supplemental`, the same shape a second screen gets.

## Payments (Stripe)

Advertisers pay AdBite; AdBite pays each shop its share. Two hops, and they
are not the same thing:

1. **Transfer** — the platform balance into the shop's connected-account
   balance, one per shop per weekly charge, naming the Stripe charge the
   money arrived on (`source_transaction`) so it moves before card funds
   settle.
2. **Payout** — that balance into the shop's own bank. In the US this is an
   ACH deposit to the account they enter during Stripe-hosted onboarding; we
   never see the details. Cadence is the **platform payout schedule**, set to
   monthly in the Stripe Dashboard under Connect settings, so a shop's balance
   accrues weekly and lands in their bank once a month. Debit-card payouts
   (Instant Payouts) are possible but cost about 1.5% and are pointless on a
   monthly cadence.

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server only. |
| `STRIPE_WEBHOOK_SECRET` | Verifies the signature on `/api/stripe/webhook`. |
| `CRON_SECRET` | Bearer token the Monday cron sends to `/api/stripe/bill`. Without it that route answers 401 and no billing happens, which is the safe default. |
| `APP_ORIGIN` | Where Checkout and onboarding return to. Defaults to `https://adbite.site`. |

**Do not set these until the payment-method flow has been run end to end in
test mode.** The first cron run charges every advertiser with delivered plays,
and an advertiser with no card on file has their campaigns paused and is
emailed about it.

Stripe will not take a payment under **fifty cents**, and this rate card is
priced in fractions of one. An advertiser under that threshold is not charged;
their plays stay unbilled (`plays.charge_id is null`) and join the next run,
which is why the weekly query asks for everything uncollected rather than one
week of it.

## Money

Stripe is shelved. Nothing is collected in the browser and nothing settles
itself: money moves by bank transfer in both directions, against numbered
paper the product raises.

- **Video** is metered. `/api/money/bill` runs every Monday (Vercel Cron,
  bearer `CRON_SECRET`), tallies the minutes each screen actually reported,
  writes `charges` / `charge_lines` / `payouts`, and raises one invoice per
  advertiser payable net 14. A week under a dollar is carried, not invoiced.
- **A permanent spot** is not metered. It is invoiced once, for the twelve
  months, the moment a shop approves the artwork (`api/notify.ts`).
- **Reconciling** is a human step, because a transfer does not announce
  itself. Read the statement, then:

  ```bash
  curl -X POST https://adbite.site/api/money/settle \
    -H "authorization: Bearer $CRON_SECRET" \
    -H "content-type: application/json" \
    -d '{"number":"AB-2026-0001"}'
  ```

  That marks the invoice and its charge paid, sends the advertiser a receipt,
  and queues each shop's share with a remittance note. Pass
  `"kind":"payout"` with a remittance number once that transfer has left the
  bank.
- **Shops** give their bank details in the dashboard (Money tab). The full
  account number is revoked from the `authenticated` role, so only the service
  role can read it back; the dashboard shows the last four.

The `BANK_*` variables above are what an invoice tells an advertiser to pay
into. Until they are set, invoices are still raised — the debt is real — but
not mailed, and the run logs that it skipped them.

## Mail the product sends

## Stripe (Phase 5 in progress)

Set these server-only values in Vercel and `.env.local` before using the new
Checkout route. Use a restricted `rk_` key with only the customer, Checkout,
SetupIntent, PaymentIntent, transfer, and Connect-account permissions this
service needs (rather than a broad `sk_` key). Configure Stripe to send
`checkout.session.completed`, `payment_intent.succeeded`,
`payment_intent.payment_failed`, and `v2.core.account.updated` to
`https://adbite.site/api/stripe/webhook`; copy that endpoint's signing secret
into `STRIPE_WEBHOOK_SECRET`.

Vercel calls `/api/stripe/bill` every Monday at 08:00 UTC. Set `CRON_SECRET`
as a sensitive Vercel environment variable; Vercel must send it as
`Authorization: Bearer <CRON_SECRET>` for the route to run. The endpoint is
idempotent per billing week, so a safe manual retry uses the same header.

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-only restricted Stripe key (`rk_`), test mode first; never expose it to the browser. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint. |
| `APP_ORIGIN` | `https://adbite.site`; used for Checkout return URLs. |
| `CRON_SECRET` | Vercel Cron authorization secret for the weekly billing route. |

`lib/email/` is every mail as data plus one layout; `api/notify.ts` sends
them through Resend after a booking or a shop's decision, called by the
browser with the user's session. `npx tsx scripts/email-preview.ts` renders
them all to `out/email/` for a look. Domain `adbite.site` is verified in Resend.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Sends everything: product mail, lead mail, and Supabase auth mail via SMTP. |
| `BANK_ACCOUNT_NAME` | The name on AdBite's account. Printed on every invoice. |
| `BANK_NAME` | The bank, for the invoice's payment block. |
| `BANK_ROUTING_NUMBER` | ABA routing number advertisers transfer to. |
| `BANK_ACCOUNT_NUMBER` | Account number advertisers transfer to. |
| `BANK_ADDRESS` | Optional. Where a cheque goes, for the advertisers who still send one. |
| `MAIL_FROM` | `AdBite <hello@adbite.site>` |
| `MAIL_REPLY_TO` | `support@adbite.site`, which every mail also names in its footer. |

## The board faces

A Roku draws text with a Font node and a Font node takes a `uri`, so a board
set in Playfair is only drawn in Playfair on the wall if the TTF is in the
assets bucket with a hash and a size the channel can check.

```bash
node --env-file=.env.local scripts/board-fonts.mjs
```

That fetches the eleven faces from Google Fonts, uploads them to R2 under
`fonts/` keyed by their own hash, and rewrites the table in
`lib/board-fonts.ts` — commit that file. Re-run it after adding a face to
`lib/fonts.ts`; it is safe to run again at any time, since an unchanged face
uploads to the same key. The faces are OFL or Apache 2.0, both of which allow
redistribution.

A face with no entry in the table is drawn in the TV's own system font, which
is what every board did before this existed.

## Reading a menu off a photograph

`/api/menu-scan` takes a photo of the menu a shop already has on the wall and
hands back sections and prices for the board editor to show them. It writes
nothing: the shop reviews what came out and chooses add-or-replace.

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Reads the photograph. Without it the endpoint returns a 503 and the editor tells the shop to type their sections in for now — everything else in the builder works unchanged. |

The picture is downscaled to 1600px in the browser, sent, read and dropped. It
is never stored and never reaches R2. Pulling a shop's *colours* out of a photo
is a different feature and needs no key at all: that runs entirely in the
browser (`lib/palette.ts`) and the picture never leaves the phone.

Addresses: `info@adbite.site` is sales and everything before an account
exists; `support@adbite.site` is everything after. Both come from `lib/site.ts`.

**Vercel functions must export a named method** (`export async function
POST(request: Request)`). A default export is the old `(req, res)` signature
and its returned `Response` is silently dropped, which is why `/api/lead`
answered nothing until 2026-09-16.

To place a shop on the network, set `shops.venue_id` to its id in
`lib/network.ts` (Bao Pao Wow is `baopaowow`). Bookings only create an
approval row for shops that have one; the rest of `VENUES` are prospects.


## Lead delivery (required before launch)

Both waitlist forms and the campaign builder POST to `/api/lead`. That endpoint
refuses to fail quietly: with no delivery route configured it answers 503 and
the form shows the visitor an error plus a mailto fallback, rather than a
success state that is a lie.

Configure **one** of these in the Vercel project:

| Variable | Purpose |
| --- | --- |
| `LEAD_WEBHOOK_URL` | Any endpoint accepting a JSON POST: a Slack or Discord incoming webhook, a Zapier or Make hook, a Google Apps Script bound to a Sheet. Simplest option. |
| `RESEND_API_KEY` + `LEAD_TO` + `LEAD_FROM` | Receive leads as email instead. `LEAD_FROM` must be a domain verified with Resend. |

Until one is set, every submission is refused and the visitor is told to email
instead. That is deliberate: silent loss is worse than a visible failure.

## Analytics

Two reporters, one call site in `components/analytics.tsx`.

**Vercel Web Analytics** is always on and takes no configuration, because the
site is deployed there. Switch it on once per project under Analytics in the
Vercel dashboard; the package is already installed and mounted.

**A self-hosted tag** is optional and runs alongside it:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ANALYTICS_SRC` | Script URL for Plausible, Fathom or Umami. |
| `NEXT_PUBLIC_ANALYTICS_SITE` | The domain to report under. |

With those unset, no second tag ships. Named events already wired, and sent to
both reporters: `shop-hero-cta`, `shop-hero-earnings`, `shop-waitlist-submit`,
`header-cta`, `header-access`, `adv-hero-build`, `adv-hero-contact`,
`adv-tier-build`, `adv-waitlist-submit`, `access-request`, `flow-build`,
`tools-open-builder`, `tour-open-dashboard`, `tv-offer-cta`, plus
`board-expand-<board>` per example board opened and `choose-<side>` on the
sign-in split.

Nothing yet reports a *completed* form. The submit buttons fire on click, which
counts attempts rather than successes, so a run of delivery failures reads as a
healthy funnel. Worth calling `track()` from the `result.ok` branch in each
form.

Any element can report a click by carrying `data-track="some-name"`.

## Languages

The site reads in English or Spanish. The choice is a preference kept in the
visitor's browser (`adbite.lang`), not a route: every page has one URL, the
prerendered HTML is English, and the copy swaps on the client once the choice
is known. A first-time visitor whose browser is set to Spanish gets Spanish
without being asked. `EN | ES` in the header switches it.

All copy lives in `lib/copy/`, one file per page, each exporting an `en`
object and an `es` object typed off it, so a string missing from the Spanish
is a type error rather than an English sentence on a Spanish page. Pages read
it through `useCopy(DICT)` from `lib/lang.ts`.

| File | Covers |
| --- | --- |
| `shared.ts` | Header, footer, sign-in door, and the names of everything the data files define by id (formats, dayparts, placements, slots, themes, badges, groups, areas) |
| `home.ts` | The shop landing page at `/shops`, format previews, board showcase |
| `advertisers.ts` | The advertiser landing page at `/`, `/signin`, the network map |
| `shop.ts` | The shop dashboard: editor, queue, earnings, TVs |
| `campaign.ts` | The advertiser dashboard, the three-step builder, reporting, the flow and tour widgets |
| `faq.ts`, `pages.ts` | FAQ; About, terms, privacy |

Spanish is neutral Latin American on "tú". A shop is a *negocio*, a board a
*tablero*, an ad an *anuncio*.

Left in English on purpose: the data files themselves (`lib/boards.ts`,
`lib/pricing.ts`, `lib/board.ts`, `lib/network.ts`), because pricing, the
TV channel and the mail templates read them; the illustrated menus inside the
scenes; page `<title>` and `description` metadata, which is one per URL; and
the transactional mail in `lib/email/`.

## Pricing

Every price comes from `lib/pricing.ts`. There are exactly two things to buy
and they are bought in different shapes, which is why it is not one rate
table.

**A permanent spot** is a place, not a quantity: one still image in the ad
space under (or beside) one shop's menu, on **one TV**, for a term. A shop
with a board over the counter and another by the door sells two, and the
builder prices the screens rather than the shop.

| Term | Price, per spot, per banner, per TV |
| --- | --- |
| Three months | $300 |
| Twelve months | $1,000 |

The year is the one to sell: the quarter renewed four times is $1,200, so the
year is cheaper than the quarter and the quarter is the way in.

**Video** is time: up to fifteen muted seconds between turns of the shop's own
footage, at **$20 an hour actually shown**. One flat rate at every hour of the
day, billed weekly on the hours that ran; an hour that did not run is never
invoiced.

Neither number is quoted on a public page. The advertiser site quotes the
video rate and refers the permanent spot to a conversation; the terms are
rendered only inside a signed-in dashboard.

What was quoted is written onto the booking (`campaigns.amount_cents`) along
with its term, so moving the rate card cannot move what somebody already
agreed to.

### The margin is private

`SHOP_SHARE` in `lib/pricing.ts` is **not exported** and is never rendered. The
shop side of the site shows only what a shop is paid; the advertiser side shows
only what an advertiser pays. Keep it that way: use `yearlyEarnings`,
`monthlyEarnings`, `weeklyEarnings`, `weeklyVideoEarnings` and
`daypartEarnings` for anything shop-facing, and never publish a gross figure
alongside a minute count, since the two together let a reader divide out the
share.

A shop's estimate is built on its permanent spots rather than on video, so it
is a floor a shop can count on rather than a best case: `yearlyEarnings` is
the spots one board holds (`SPOTS_PER_SCREEN`, ten per screen) at the yearly
rate, times the share. Video is quoted separately by `weeklyVideoEarnings`,
which is what a week would add if every minute sold.

## What an advertiser sees of a shop

`api/network.ts` (`GET /api/network?venues=a,b`) hands a signed-in advertiser
each chosen shop's **live board** -- the same JSON its owner edits and its own
TVs draw -- plus its TVs and how much of each banner is already sold. The
builder renders it with `BoardCanvas`, the shop's own component, and drops the
advertiser's artwork into the ad space, so what is approved is what goes up.

It is a function rather than a query from the browser because row-level
security lets a shop read its own board and nobody else's, and the fix for
that would open `devices` -- which holds the secret a TV authenticates with --
to every signed-in account. The service role reads; the function returns only
what a buyer has any business seeing.

## The screen network

`lib/network.ts` holds every shop. Bao Pao Wow is real and carries
`status: 'live'`. The other sixteen are stand-ins carrying `status: 'prospect'`
so the campaign builder can be exercised the way it will work once the network
fills in: multi-select, whole neighbourhoods, a radius drawn round your own
door. They are badged **Installing** / **Waitlist** wherever they appear.

When a shop signs, flip its `status` to `'live'`. `LIVE_VENUES` is what the
public marketing pages price and map; `VENUES` is what the builder offers.
Keep it that way, or a page that says "live in one shop" will quietly map
seventeen.

Shops group two ways, and both are one-press selections in the builder:

| Grouping | Constant | Used for |
| --- | --- | --- |
| Neighbourhood | `NEIGHBORHOODS` (`area`) | Chips that take a part of town and fly the map there |
| Kind of shop | `GROUPS` (`group`) | Chips that take every barber, every café, and so on |

Shift-clicking either chip filters the list instead of taking the shops.

The map carries three tools: **Pick** (click a pin), **Radius** (press and drag
out from a point) and **Draw area** (click corners, double-click to close).
`distanceKm`, `venuesWithin` and `pointInPolygon` in `lib/network.ts` resolve a
shape to the shops inside it; `components/selection-map.tsx` is the Leaflet
wiring.

## Reporting

`lib/delivery.ts` answers where a campaign played, for how long, and at what
cost. **Nothing in it is measured.** There is no ad server in the pilot, so
every figure is arithmetic on the booking: the week is spread across the shops
bought in proportion to what each has to sell, then priced on the same rate
card the advertiser saw. The one non-arithmetic part is a ±12% day-to-day
wobble seeded off the campaign id, so a chart is stable across reloads; it is
texture, it is centred, and it never moves a total.

Every panel that renders it says so, and a campaign that has not started is
labelled as showing the week it booked rather than a week that ran.

When a real ad server lands, this file is the seam: keep the shapes, swap the
source.

The dashboard's empty state can load three worked examples. They carry
`sample: true`, are badged **Sample** everywhere, and clear in one click. The
dashboard is never seeded automatically.

## Two sides, one /dashboard

There is no login. `lib/account.ts` stores a preference — `advertiser` or
`shop` — in the browser, and `/dashboard` opens the matching workspace. It is
not authentication and does not pretend to be: a switch in either header flips
it, because both halves are worth seeing before you commit to either.

| Side | Workspace | What it does |
| --- | --- | --- |
| `advertiser` | `app/dashboard/advertiser-dashboard.tsx` | Build a campaign, read what it did |
| `shop` | `app/dashboard/shop-dashboard.tsx` | Design the board, approve ads, see the earnings |

The two are one product, and the seams are real: the ad a shop approves is the
campaign an advertiser built, and approving it is what sets `startedAt` and so
what starts the advertiser's reporting. The share a shop sets on its board is
the inventory the advertiser is buying.

## The board designer

`lib/board.ts` is the shop's own half of the screen: sections, items, prices,
three boards for three parts of the day, four grounds, the review ticker, a
clip of the shop's own food, and the share of the screen ads may use.

`components/board/board-canvas.tsx` draws it, sized in container units
(`cqw`) rather than pixels, so the same component is the editor's live preview
at 700px and the marketing page's example at 400px with no second set of
numbers to keep in step. `components/board-showcase.tsx` is that example: it
renders the real canvas from the real starter board, so the shop page cannot
drift from the product the way a mockup would.

Reordering items is native drag-and-drop **and** arrow keys on the grip. Keep
both. Drag alone puts the one genuinely spatial task in the product out of
reach of anyone not using a mouse.

A board placed by hand (`lib/layout.ts`) is blocks on a grid, and a selected
block carries its three grips on the board itself: the corner resizes, the
stalk above it turns, and the bin beside that removes it. Turning is
`block.rotate`, in degrees clockwise about the block's middle, and it is drawn
three times over -- `transform: rotate()` in the preview, a rotated `Group`
with `scaleRotateCenter` in `roku/components/MenuPane.brs` (SceneGraph is
anticlockwise-positive, so the sign flips), and a rotated PIL tile in
`roku/tools/preview.py`. Change one and change all three.

**Edit full screen** on a placed board opens the same editor against the
viewport -- same state, same selection, nothing unmounts -- because a cell on
a 700px board is nine pixels. Escape closes it.

Earnings on the shop side are priced against the shop's own `adShare`, so
moving that slider moves the money. That loop is the point of the screen.

## Screenshots on the advertiser page

The advertiser page at `/` shows the real dashboard rather than a drawing of one.
`public/shots/*.webp` are captured from the running product and played by
`components/dashboard-reel.tsx`.

**They go stale when the dashboard changes, and nothing catches that.** To
retake them: run the dev server, open `/dashboard`, load the sample campaigns,
and capture at 1360x850 at 2x —

| Frame | Where |
| --- | --- |
| `01-overview` | Dashboard, Overview tab, on a video campaign |
| `02-where` | Dashboard, Where it ran |
| `03-when` | Dashboard, When it ran |
| `04-place` | New campaign, step 01, with a neighbourhood taken |
| `06-make` | New campaign, step 03 |

Then `magick <shot>.png -resize 1360x -strip -quality 84 <shot>.webp`. Wait for
map tiles to finish loading before capturing 02 and 04, or the frame ships with
a grey map in it.

**Three things these frames must not show.** There is no `05`, because step 02
quotes what a permanent spot costs and the public page deliberately does not:
that number is settled in a conversation, and a screenshot of the builder would
publish it. For the same reason, switch the format to Short video before taking
`04` and `06` — the summary bar pinned to the bottom of the builder carries the
spot price too. And whatever is in the capturing account's own campaign list
ships with the frame, so load the samples and hide the rest; a real brand in
that sidebar reads as a customer we do not have. Third, the dashboard header
prints the signed-in address (`.dash-who`), top right, and it is legible at the
size these ship at — the frames once went out carrying a personal Gmail. Take
them from an account whose address is one we are happy to publish, or paint the
header over afterwards: `you@yourbusiness.com` in Geist Medium 13px,
`rgba(255,255,255,.72)`, right-aligned to x=1177 at 1360px wide.

## Vertical rhythm

Sections used to be padded 96-104px top and bottom, which on the 1280x800
laptop most people read this on handed a quarter of the screen to air. Two
variables in `:root` now carry the whole rhythm:

```
--band        clamp(44px, 7vh, 104px)   full section
--band-tight  clamp(34px, 5.5vh, 74px)  bands and hero
```

Headings answer to height as well as width (`min(4.9vw, 8.2vh)`), for the same
reason: a 68px headline is 68px whether the window is 900px tall or 680px.
Change the two variables and every band on the site moves together.

The advertiser dashboard and the campaign builder are a fixed-height app
shell: `100dvh`, nothing scrolls but the named panes inside it (the campaign
list, the report body, the shop list, the board previews). Below 1040px the
lock comes off and the page scrolls the way a page does.

## Domain

`lib/site.ts` holds the canonical origin and the contact address. They used to
disagree (`adbite.co` in metadata, `adbite.site` in every footer); both now read
from that one file. `public/robots.txt` and `public/sitemap.xml` hardcode the
origin, so change those together.
