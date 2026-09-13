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

## Domain

`lib/site.ts` holds the canonical origin and the contact address. They used to
disagree (`adbite.co` in metadata, `adbite.site` in every footer); both now read
from that one file. `public/robots.txt` and `public/sitemap.xml` hardcode the
origin, so change those together.
