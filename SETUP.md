# AdBite setup

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
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Without it the signed PUT is refused by the browser (the server-side path,
and therefore the seeded demo spot, still works).

**Video is not transcoded yet.** An MP4 is accepted up to 12 MB and 20
seconds and goes to a TV as uploaded; a file the Roku cannot decode is
dropped from the rotation rather than shown as a black rectangle. The render
worker in phase 4 is what makes that guarantee instead of a hope.

## Mail the product sends

`lib/email/` is every mail as data plus one layout; `api/notify.ts` sends
them through Resend after a booking or a shop's decision, called by the
browser with the user's session. `npx tsx scripts/email-preview.ts` renders
them all to `out/email/` for a look. Domain `adbite.site` is verified in Resend.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Sends everything: product mail, lead mail, and Supabase auth mail via SMTP. |
| `MAIL_FROM` | `AdBite <hello@adbite.site>` |
| `MAIL_REPLY_TO` | `support@adbite.site`, which every mail also names in its footer. |

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
| `home.ts` | The shop landing page, format previews, board showcase |
| `advertisers.ts` | The advertiser landing page, `/signin`, the network map |
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

Every price on the site comes from `lib/pricing.ts`. Change a rate there and the
money band, the rate cards, the packages grid, the spend slider, the campaign
summary, the FAQ and the pilot terms all move together.

Price moves on two axes. **When** it runs: peak is lunch and dinner, off-peak is
the afternoon. **What shape** it is: the more of the board an ad takes, the more
it costs.

| Format | Peak | Off-peak | Billed by |
| --- | --- | --- | --- |
| Bottom banner | $0.15 | $0.08 | minute |
| Side rail | $0.24 | $0.13 | minute |
| Full screen | $0.33 | $0.18 | minute |
| Short video | $0.10 | $0.06 | **play** (15s) |

Video is billed per play because a count of runs is what an advertiser buys.
Per minute it works out at $0.40 peak, a little above full screen.

### The margin is private

`SHOP_SHARE` in `lib/pricing.ts` is **not exported** and is never rendered. The
shop side of the site shows only what a shop is paid; the advertiser side shows
only what an advertiser pays. Keep it that way: use `weeklyEarnings`,
`weeklyCeiling` and `daypartEarnings` for anything shop-facing, and never
publish a gross figure alongside a minute count, since the two together let a
reader divide out the share.

Shop earnings are quoted on the cheapest format, so the figure is a floor:

```
Bao Pao Wow, 11am-9pm Mon-Sat, a third of the board sold as ads
1,200 ad-minutes a week (840 peak, 360 off-peak)

  all banner  ->  paid about $100 / wk   ($436 / mo, ~$5,232 / yr)
  all full    ->  paid about $222 / wk
```

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

Earnings on the shop side are priced against the shop's own `adShare`, so
moving that slider moves the money. That loop is the point of the screen.

## Screenshots on the advertiser page

`/advertisers` shows the real dashboard rather than a drawing of one.
`public/shots/*.webp` are captured from the running product and played by
`components/dashboard-reel.tsx`.

**They go stale when the dashboard changes, and nothing catches that.** To
retake them: run the dev server, open `/dashboard`, load the sample campaigns,
and capture at 1360x850 at 2x —

| Frame | Where |
| --- | --- |
| `01-overview` | Dashboard, Overview tab |
| `02-where` | Dashboard, Where it ran |
| `03-when` | Dashboard, When it ran |
| `04-place` | New campaign, step 01, with a neighbourhood taken |
| `05-price` | New campaign, step 02 |
| `06-make` | New campaign, step 03 |

Then `magick <shot>.png -resize 1360x -strip -quality 84 <shot>.webp`. Wait for
map tiles to finish loading before capturing 02 and 04, or the frame ships with
a grey map in it.

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
