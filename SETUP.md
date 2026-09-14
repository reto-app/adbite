# AdBite setup

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

## Analytics (optional)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ANALYTICS_SRC` | Script URL for Plausible, Fathom or Umami. |
| `NEXT_PUBLIC_ANALYTICS_SITE` | The domain to report under. |

With nothing set the site ships no tag at all. Named events already wired:
`shop-hero-cta`, `shop-hero-earnings`, `shop-waitlist-submit`, `header-cta`,
`adv-hero-build`, `adv-hero-contact`, `adv-tier-build`, `adv-waitlist-submit`,
`flow-build`, `campaign-next`, `campaign-submit`.

Any element can report a click by carrying `data-track="some-name"`.

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
