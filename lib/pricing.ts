/* What an advertiser pays, and what a shop gets paid.
 *
 * Two audiences, two numbers, and neither is shown the other's. Advertisers
 * see a rate card. Shops see their earnings. AdBite's own margin is the
 * difference between them and is never rendered anywhere on the site: it lives
 * in SHOP_SHARE below and is used only to turn one into the other.
 *
 * There are exactly two things to buy, and they are bought in different
 * shapes, which is the whole reason this file is not one rate table:
 *
 *   A PERMANENT SPOT is a place, not a quantity. A static ad in the strip
 *   under one shop's menu, on one screen, for a term. A board holds a fixed
 *   number of them, so what an advertiser is choosing is which screens have
 *   one free. It is invoiced once, up front, and nothing about it is metered.
 *   The unit is one spot, in one banner, on one TV: two screens in the same
 *   shop are two spots, because they are two walls.
 *
 *   Two terms, and the year is the one we want sold: three months at $300 is
 *   $1,200 a year, so the year at $1,000 is cheaper than the quarter renewed
 *   and the quarter is the way in for a shop that wants to try it.
 *
 *   VIDEO is time. Fifteen muted seconds between turns of the shop's own
 *   footage, bought by the hour and billed on the hours that actually ran.
 *   One flat rate: there is no peak, because a flat number is one an
 *   advertiser can hold in their head and we would rather be held to it.
 *
 * The public advertiser page quotes the video rate and refers the permanent
 * spot to a conversation. SPOT_YEARLY below is the number the builder prices
 * a spot at, and is not rendered anywhere outside a signed-in dashboard. */

import type { FormatId } from '@/lib/boards';

export type Daypart = 'lunch' | 'afternoon' | 'evening';
export type PriceUnit = 'year' | 'hour';

/** How long a permanent spot is bought for. */
export type SpotTerm = 'quarter' | 'year';

/** A spot is fifteen seconds, so four of them fill a minute. */
export const SPOT_SECONDS = 15;
export const PLAYS_PER_MINUTE = 60 / SPOT_SECONDS;

/* ---- the rate card ------------------------------------------------------ */

/** One permanent bottom-banner spot, on one screen, for twelve months. */
export const SPOT_YEARLY = 1000;

/** The same spot for three months. */
export const SPOT_QUARTERLY = 300;

export const SPOT_TERMS: { id: SpotTerm; months: number; price: number }[] = [
  { id: 'quarter', months: 3, price: SPOT_QUARTERLY },
  { id: 'year', months: 12, price: SPOT_YEARLY },
];

export function termById(id: SpotTerm) {
  return SPOT_TERMS.find((term) => term.id === id) ?? SPOT_TERMS[1];
}

/** What one spot costs over a term. */
export function spotPrice(term: SpotTerm) {
  return termById(term).price;
}

/** Video, per hour the spot was actually on screen. */
export const VIDEO_HOURLY = 20;

/** The same video rate by the minute, which is how delivery is counted. */
export const VIDEO_PER_MINUTE = VIDEO_HOURLY / 60;

export const FORMAT_PRICES: Record<FormatId, { unit: PriceUnit; rate: number }> = {
  banner: { unit: 'year', rate: SPOT_YEARLY },
  video: { unit: 'hour', rate: VIDEO_HOURLY },
};

/** Never rendered. Turns what advertisers pay into what the shop is paid. */
const SHOP_SHARE = 0.65;

/** Ads take a third of the board; the shop's own content keeps the rest. */
export const DEFAULT_AD_SHARE = 1 / 3;

export function unitOf(format: FormatId) {
  return FORMAT_PRICES[format].unit;
}

/** True for the thing that is a place rather than a quantity of time. */
export function isPermanent(format: FormatId) {
  return FORMAT_PRICES[format].unit === 'year';
}

/** The price of one unit of this format: a year for a spot, an hour of video. */
export function rateFor(format: FormatId) {
  return FORMAT_PRICES[format].rate;
}

/** Per minute, which is the unit delivery is counted in. Zero for a spot,
    which is bought outright and never metered. */
export function perMinuteRate(format: FormatId) {
  return isPermanent(format) ? 0 : FORMAT_PRICES[format].rate / 60;
}

/* ---- the shop day -------------------------------------------------------
   Dayparts survive the flat rate because reporting still splits a week by
   them: an advertiser wants to know which hours their video actually landed
   in, even when every hour costs the same. Nothing here prices anything. */

export const DAYPARTS: {
  id: Daypart;
  label: string;
  window: string;
  /** Hours this daypart runs on a day the shop is open. */
  hours: number;
}[] = [
  { id: 'lunch', label: 'Lunch', window: '11am-2pm', hours: 3 },
  { id: 'afternoon', label: 'Afternoon', window: '2pm-5pm', hours: 3 },
  { id: 'evening', label: 'Evening', window: '5pm-9pm', hours: 4 },
];

export function daypartById(id: Daypart) {
  return DAYPARTS.find((part) => part.id === id) ?? DAYPARTS[0];
}

const ALL_DAYPARTS: Daypart[] = DAYPARTS.map((part) => part.id);

/* ---- inventory ---------------------------------------------------------- */

/** Just enough of a venue to price it. The real ones live in lib/network.ts. */
export type Priceable = {
  screens: number;
  daysOpen: number;
  /** Share of screen time sold as ads. Defaults to a third. */
  adShare?: number;
  /** Permanent spots already sold on this board. */
  spotsTaken?: number;
};

/* Permanent bottom-banner spots one screen carries before it is full. This
   is inventory, not marketing: the builder counts what is free against it
   and the shop's floor is built on it, but the number is not quoted anywhere
   on the site. What a board holds and what it pays are settled with each
   shop as it joins. */
export const SPOTS_PER_SCREEN = 10;

/** How many permanent spots this venue has in total. */
export function spotsOn(venue: Priceable) {
  return venue.screens * SPOTS_PER_SCREEN;
}

/** How many are still there to buy. */
export function spotsFree(venue: Priceable) {
  return Math.max(0, spotsOn(venue) - (venue.spotsTaken ?? 0));
}

export function totalSpotsFree(venues: Priceable[]) {
  return venues.reduce((total, venue) => total + spotsFree(venue), 0);
}

/** Minutes of ad time one venue has to sell in a daypart, each week. */
export function weeklyMinutes(venue: Priceable, id: Daypart) {
  const share = venue.adShare ?? DEFAULT_AD_SHARE;
  return Math.round(daypartById(id).hours * 60 * venue.daysOpen * venue.screens * share);
}

/** Minutes of video these venues can carry in a week, and what that is worth. */
export function inventory(venues: Priceable[], dayparts: Daypart[] = ALL_DAYPARTS) {
  const chosen = dayparts.length ? dayparts : ALL_DAYPARTS;
  let minutes = 0;
  for (const venue of venues) {
    for (const id of chosen) minutes += weeklyMinutes(venue, id);
  }
  return { minutes, hours: minutes / 60, value: minutes * VIDEO_PER_MINUTE };
}

/** The most video hours a week on these screens could hold. */
export function maxHours(venues: Priceable[], dayparts: Daypart[] = ALL_DAYPARTS) {
  return Math.max(1, Math.floor(inventory(venues, dayparts).hours));
}

/** What a run of video hours costs. */
export function videoCost(hours: number) {
  return hours * VIDEO_HOURLY;
}

/** What a set of permanent spots costs over a term. One spot is one banner on
    one TV, so `spots` is normally how many screens were chosen. */
export function spotCost(spots: number, term: SpotTerm = 'year') {
  return spots * spotPrice(term);
}

/* ---- the shop's side ----------------------------------------------------
   These return what the shop is paid. Nothing here exposes the share it is
   worked out from, and no component should render anything but the result.

   A shop's year is the permanent spots on its own boards plus whatever video
   ran across them. The spots are the part that is predictable, so they are
   what the estimate is built on and the video is quoted separately: a floor a
   shop can count on rather than a best case. */

/** A shop's cut of one booking, split evenly across the boards it named. */
export function shopEarningsFromSpend(spend: number, boardsInBooking: number) {
  return (spend / Math.max(1, boardsInBooking)) * SHOP_SHARE;
}

/** What the permanent spots on this board pay their shop in a year. */
export function yearlyEarnings(venue: Priceable) {
  return spotsOn(venue) * SPOT_YEARLY * SHOP_SHARE;
}

export function monthlyEarnings(venue: Priceable) {
  return yearlyEarnings(venue) / 12;
}

export function weeklyEarnings(venue: Priceable) {
  return yearlyEarnings(venue) / 52;
}

/** What a week of video on this board would add on top, if every minute sold. */
export function weeklyVideoEarnings(venue: Priceable) {
  return inventory([venue]).value * SHOP_SHARE;
}

/** What a shop is paid for one daypart's video minutes in a week. */
export function daypartEarnings(venue: Priceable, id: Daypart) {
  return weeklyMinutes(venue, id) * VIDEO_PER_MINUTE * SHOP_SHARE;
}

/* ---- formatting --------------------------------------------------------- */

export const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Rates that are not round dollars need the decimals the money formatter drops. */
export const cents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export const count = new Intl.NumberFormat('en-US');

export function hoursLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (!hours) return `${rest} min`;
  return rest ? `${count.format(hours)} hr ${rest} min` : `${count.format(hours)} hr`;
}
