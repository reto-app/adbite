/* What an advertiser pays, and what a shop gets paid.
 *
 * Two audiences, two numbers, and neither is shown the other's. Advertisers
 * see a rate card. Shops see their earnings. AdBite's own margin is the
 * difference between them and is never rendered anywhere on the site: it lives
 * in SHOP_SHARE below and is used only to turn one into the other.
 *
 * Price moves on two axes:
 *
 *   WHEN   peak is lunch and dinner, when there is a queue in front of the
 *          board. Off-peak is the quiet middle of the afternoon, about half.
 *
 *   WHAT   a strip under the menu is the cheapest thing we sell. Taking the
 *          right third costs more. Blanking the whole board costs more again,
 *          because for that turn the shop's own menu is gone.
 *
 * Video is the exception to the unit, not just the rate: it is billed per play
 * rather than per minute, because what an advertiser is buying is a number of
 * fifteen-second runs, and counting them is the honest way to charge for it.
 * Its per-play price works out a little above full screen. */

import type { FormatId } from '@/lib/boards';

export type Tier = 'peak' | 'off';
export type Daypart = 'lunch' | 'afternoon' | 'evening';
export type PriceUnit = 'minute' | 'play';

/** A spot is fifteen seconds, so four of them fill a minute. */
export const SPOT_SECONDS = 15;
export const PLAYS_PER_MINUTE = 60 / SPOT_SECONDS;

/* ---- the rate card ------------------------------------------------------ */

export const FORMAT_PRICES: Record<
  FormatId,
  { unit: PriceUnit; rates: Record<Tier, number> }
> = {
  /* A strip under the menu. The board stays readable, so it is the least we
     ask the room for and the least we charge. */
  banner: { unit: 'minute', rates: { peak: 0.15, off: 0.08 } },
  /* The right third, top to bottom, beside the menu. */
  rail: { unit: 'minute', rates: { peak: 0.24, off: 0.13 } },
  /* The whole board for your turn. The menu is gone while it runs. */
  full: { unit: 'minute', rates: { peak: 0.33, off: 0.18 } },
  /* Fifteen seconds of motion. Quoted and billed by the minute like the
     rest, which is the same money as the old per-play rate -- four plays
     fill a minute -- and the only unit that can describe a spot inside a
     looping reel, where no discrete "play" exists to count. */
  video: { unit: 'minute', rates: { peak: 0.4, off: 0.24 } },
};

/* The format a shop's earnings estimate is quoted on. It is the cheapest one,
   so the figure a shop is shown is a floor rather than a best case. */
export const BASELINE_FORMAT: FormatId = 'banner';

/** Never rendered. Turns what advertisers pay into what the shop is paid. */
const SHOP_SHARE = 0.65;

/** Ads take a third of the board; the shop's own content keeps the rest. */
export const DEFAULT_AD_SHARE = 1 / 3;

export const DAYPARTS: {
  id: Daypart;
  label: string;
  window: string;
  tier: Tier;
  /** Hours this daypart runs on a day the shop is open. */
  hours: number;
}[] = [
  { id: 'lunch', label: 'Lunch', window: '11am-2pm', tier: 'peak', hours: 3 },
  { id: 'afternoon', label: 'Afternoon', window: '2pm-5pm', tier: 'off', hours: 3 },
  { id: 'evening', label: 'Evening', window: '5pm-9pm', tier: 'peak', hours: 4 },
];

export const PEAK_DAYPARTS = DAYPARTS.filter((part) => part.tier === 'peak');
export const OFF_DAYPARTS = DAYPARTS.filter((part) => part.tier === 'off');

export function daypartById(id: Daypart) {
  return DAYPARTS.find((part) => part.id === id) ?? DAYPARTS[0];
}

export function unitOf(format: FormatId) {
  return FORMAT_PRICES[format].unit;
}

/** The price of one unit of this format: a minute, or a play for video. */
export function rateFor(format: FormatId, daypart: Daypart) {
  return FORMAT_PRICES[format].rates[daypartById(daypart).tier];
}

/** The same price expressed per minute, so formats can be compared. */
export function perMinuteRate(format: FormatId, daypart: Daypart) {
  const rate = rateFor(format, daypart);
  return unitOf(format) === 'play' ? rate * PLAYS_PER_MINUTE : rate;
}

/** Cheapest and dearest across the whole card, for "from X" lines. */
export const RATE_FLOOR = FORMAT_PRICES.banner.rates.off;
export const RATE_CEILING = FORMAT_PRICES.full.rates.peak;

/* ---- inventory ---------------------------------------------------------- */

/** Just enough of a venue to price it. The real ones live in lib/network.ts. */
export type Priceable = {
  screens: number;
  daysOpen: number;
  /** Share of screen time sold as ads. Defaults to a third. */
  adShare?: number;
};

/** Minutes of ad time one venue has to sell in a daypart, each week. */
export function weeklyMinutes(venue: Priceable, id: Daypart) {
  const share = venue.adShare ?? DEFAULT_AD_SHARE;
  return Math.round(daypartById(id).hours * 60 * venue.daysOpen * venue.screens * share);
}

const ALL_DAYPARTS: Daypart[] = DAYPARTS.map((part) => part.id);

/** What is available across some venues and dayparts, priced for a format. */
export function inventory(
  venues: Priceable[],
  dayparts: Daypart[] = ALL_DAYPARTS,
  format: FormatId = BASELINE_FORMAT,
) {
  const chosen = dayparts.length ? dayparts : ALL_DAYPARTS;
  let minutes = 0;
  let value = 0;
  for (const venue of venues) {
    for (const id of chosen) {
      const mins = weeklyMinutes(venue, id);
      minutes += mins;
      value += mins * perMinuteRate(format, id);
    }
  }
  return { minutes, plays: Math.round(minutes * PLAYS_PER_MINUTE), value };
}

/** The average price of a minute across whatever is selected. */
export function blendedRate(
  venues: Priceable[],
  dayparts: Daypart[] = ALL_DAYPARTS,
  format: FormatId = BASELINE_FORMAT,
) {
  const { minutes, value } = inventory(venues, dayparts, format);
  return minutes ? value / minutes : perMinuteRate(format, 'lunch');
}

/** How many minutes a weekly spend buys, capped by what actually exists. */
export function minutesFor(
  spend: number,
  venues: Priceable[],
  dayparts: Daypart[] = ALL_DAYPARTS,
  format: FormatId = BASELINE_FORMAT,
) {
  const rate = blendedRate(venues, dayparts, format);
  const { minutes: available } = inventory(venues, dayparts, format);
  return Math.min(available, Math.round(spend / rate));
}

/** Plays that spend buys. The billed unit for video. */
export function playsFor(
  spend: number,
  venues: Priceable[],
  dayparts: Daypart[] = ALL_DAYPARTS,
  format: FormatId = BASELINE_FORMAT,
) {
  return Math.round(minutesFor(spend, venues, dayparts, format) * PLAYS_PER_MINUTE);
}

/** The most a week on these screens can cost, because that is all there is. */
export function maxSpend(
  venues: Priceable[],
  dayparts: Daypart[] = ALL_DAYPARTS,
  format: FormatId = BASELINE_FORMAT,
) {
  return Math.floor(inventory(venues, dayparts, format).value);
}

/* ---- the shop's side ----------------------------------------------------
   These return what the shop is paid. Nothing here exposes the share it is
   worked out from, and no component should render anything but the result. */

/** What a shop takes home in a week, quoted on the cheapest format. */
/** A shop's cut of one booking's weekly spend, split evenly across the boards
    it named. Shop-facing: the share itself stays private. */
export function shopEarningsFromSpend(spend: number, boardsInBooking: number) {
  return (spend / Math.max(1, boardsInBooking)) * SHOP_SHARE;
}

export function weeklyEarnings(venue: Priceable) {
  return inventory([venue], ALL_DAYPARTS, BASELINE_FORMAT).value * SHOP_SHARE;
}

/** The same week if every minute sold as the dearest format instead. */
export function weeklyCeiling(venue: Priceable) {
  return inventory([venue], ALL_DAYPARTS, 'full').value * SHOP_SHARE;
}

export function monthlyEarnings(venue: Priceable) {
  return weeklyEarnings(venue) * (52 / 12);
}

export function yearlyEarnings(venue: Priceable) {
  return weeklyEarnings(venue) * 52;
}

/** What a shop is paid for one daypart's minutes, on the baseline format. */
export function daypartEarnings(venue: Priceable, id: Daypart) {
  return weeklyMinutes(venue, id) * perMinuteRate(BASELINE_FORMAT, id) * SHOP_SHARE;
}

/* ---- formatting --------------------------------------------------------- */

export const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Rates are cents, so they need the decimals the money formatter drops. */
export const cents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export const count = new Intl.NumberFormat('en-US');

/** "$0.15 / min" or "$0.10 / play", whichever this format is billed in. */
export function rateLabel(format: FormatId, daypart: Daypart) {
  return `${cents.format(rateFor(format, daypart))} / ${unitOf(format)}`;
}

export function unitLabel(format: FormatId, plural = true) {
  const unit = unitOf(format);
  return plural ? `${unit}s` : unit;
}

export function hoursLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${count.format(hours)} hr ${rest} min` : `${count.format(hours)} hr`;
}
