/* What a campaign actually did: where it played, for how long, at what cost.
 *
 * There is no ad server in the pilot, so nothing here is measured. Every
 * figure is *modelled*: the booking is spread across the shops and dayparts it
 * bought, in proportion to the inventory each one has, and priced at the same
 * rate card the advertiser saw when they booked. That makes it arithmetic on
 * the booking rather than a reading off a screen, and every surface that
 * renders it says so.
 *
 * The one thing that is not pure arithmetic is the day-to-day wobble: a real
 * week never lands flat. `jitter` below gives each day a repeatable ±12%
 * nudge seeded off the campaign id, so a campaign's chart is stable across
 * reloads instead of reshuffling on every render. It is texture, not data,
 * and it is centred so it never moves a total.
 *
 * That was the whole story until TVs started reporting what they played.
 * A campaign with a play log now reads its headline figures off that log
 * (`Measured` below) and keeps the model only for the shapes nothing counts:
 * reach, and the day-to-day and shop-to-shop splits. `source` on the totals
 * says which of the two a surface is showing, and every surface labels it. */

import { FORMATS, type FormatId } from '@/lib/boards';
import { VENUES, type Venue } from '@/lib/network';
import type { Priceable } from '@/lib/pricing';
import {
  DAYPARTS,
  PLAYS_PER_MINUTE,
  blendedRate,
  perMinuteRate,
  unitOf,
  weeklyMinutes,
  type Daypart,
} from '@/lib/pricing';

export type Bookable = {
  id: string;
  venues: string[];
  dayparts: Daypart[];
  weeklySpend: number;
  format: FormatId;
  createdAt: number;
  /** Unset until the shop approves the creative and the board starts playing. */
  startedAt?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---- a repeatable wobble ------------------------------------------------ */

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A number in [-1, 1) that is always the same for the same seed. */
function jitter(seed: string) {
  return (hash(seed) % 2000) / 1000 - 1;
}

/* ---- what the booking bought -------------------------------------------- */

const ALL_DAYPARTS: Daypart[] = DAYPARTS.map((part) => part.id);

export function venuesOf(booking: Pick<Bookable, 'venues'>): Venue[] {
  const chosen = VENUES.filter((venue) => booking.venues.includes(venue.id));
  return chosen.length ? chosen : VENUES.slice(0, 1);
}

export function daypartsOf(booking: Pick<Bookable, 'dayparts'>): Daypart[] {
  return booking.dayparts.length ? booking.dayparts : ALL_DAYPARTS;
}

/** Whether a shop is open on a given JS weekday (0 = Sunday), going by the
    days a week it opens. Sunday closes first, then Monday, then Tuesday, which
    is the order these shops actually shut in. */
const CLOSED_ORDER = [0, 1, 2];
export function openOn(venue: Priceable & { daysOpen: number }, weekday: number) {
  const shut = 7 - venue.daysOpen;
  return !CLOSED_ORDER.slice(0, shut).includes(weekday);
}

/* ---- the split ---------------------------------------------------------- */

export type VenueSplit = {
  venue: Venue;
  /** Share of the week's spend this shop takes, 0-1. */
  share: number;
  minutes: number;
  plays: number;
  spend: number;
  /** Modelled heads past the board while the ad was up. */
  reach: number;
  /** What a minute cost here, blended across the dayparts bought. */
  rate: number;
};

/** How spend lands across the shops booked. Shops with more screens and more
    open hours carry more of it, because they have more to sell. `scale` is
    weeks: 1 for the week as booked, `weeksRunning` for delivery to date. */
export function splitByVenue(booking: Bookable, scale = 1): VenueSplit[] {
  const venues = venuesOf(booking);
  const dayparts = daypartsOf(booking);
  const format = booking.format;

  const supply = venues.map((venue) => ({
    venue,
    minutes: dayparts.reduce((total, id) => total + weeklyMinutes(venue, id), 0),
  }));
  const totalSupply = supply.reduce((total, item) => total + item.minutes, 0) || 1;

  return supply.map(({ venue, minutes: supplyMinutes }) => {
    const share = supplyMinutes / totalSupply;
    const weekSpend = booking.weeklySpend * share;
    const rate = blendedRate([venue], dayparts, format);
    const weekMinutes = Math.min(supplyMinutes, weekSpend / rate);
    /* Heads past the board, pro-rated by the slice of this shop's open week
       the ad actually occupied. */
    const occupancy = supplyMinutes ? weekMinutes / supplyMinutes : 0;
    return {
      venue,
      share,
      minutes: Math.round(weekMinutes * scale),
      plays: Math.round(weekMinutes * PLAYS_PER_MINUTE * scale),
      spend: weekSpend * scale,
      reach: Math.round(venue.footfall * occupancy * scale),
      rate,
    };
  });
}

export type DaypartSplit = {
  id: Daypart;
  label: string;
  window: string;
  tier: 'peak' | 'off';
  minutes: number;
  plays: number;
  spend: number;
  rate: number;
};

export function splitByDaypart(booking: Bookable, scale = 1): DaypartSplit[] {
  const venues = venuesOf(booking);
  const dayparts = daypartsOf(booking);
  const format = booking.format;

  const supply = DAYPARTS.filter((part) => dayparts.includes(part.id)).map((part) => ({
    part,
    minutes: venues.reduce((total, venue) => total + weeklyMinutes(venue, part.id), 0),
    rate: perMinuteRate(format, part.id),
  }));

  const totalValue = supply.reduce((total, item) => total + item.minutes * item.rate, 0) || 1;

  return supply.map(({ part, minutes: supplyMinutes, rate }) => {
    const value = supplyMinutes * rate;
    const weekSpend = booking.weeklySpend * (value / totalValue);
    const weekMinutes = Math.min(supplyMinutes, weekSpend / rate);
    return {
      id: part.id,
      label: part.label,
      window: part.window,
      tier: part.tier,
      minutes: Math.round(weekMinutes * scale),
      plays: Math.round(weekMinutes * PLAYS_PER_MINUTE * scale),
      spend: weekSpend * scale,
      rate,
    };
  });
}

/* ---- the run so far ------------------------------------------------------ */

/** Whole and part weeks the campaign has been running, floored at 0. */
export function weeksRunning(booking: Bookable) {
  if (!booking.startedAt) return 0;
  const elapsed = Math.max(0, Date.now() - booking.startedAt);
  return elapsed / (7 * DAY_MS);
}

export function daysRunning(booking: Bookable) {
  if (!booking.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - booking.startedAt) / DAY_MS));
}

export type DayRow = {
  date: Date;
  label: string;
  weekday: string;
  open: boolean;
  minutes: number;
  plays: number;
  spend: number;
};

/** Day by day since the campaign started, most recent last. Capped at 28 so
    the chart stays a chart. */
export function byDay(booking: Bookable, limit = 28): DayRow[] {
  const start = booking.startedAt;
  if (!start) return [];

  const venues = venuesOf(booking);
  const dayparts = daypartsOf(booking);
  const rate = blendedRate(venues, dayparts, booking.format);

  /* The weekly spend is shared out over the days every booked shop is open,
     so a shop that shuts on Sunday does not quietly bill for it. */
  const openWeight = (weekday: number) =>
    venues.reduce((total, venue) => total + (openOn(venue, weekday) ? venue.screens : 0), 0);
  const weekWeight = [0, 1, 2, 3, 4, 5, 6].reduce((total, day) => total + openWeight(day), 0) || 1;

  const days = Math.min(limit, daysRunning(booking));
  const rows: DayRow[] = [];

  for (let back = days - 1; back >= 0; back--) {
    const date = new Date(Date.now() - back * DAY_MS);
    const weekday = date.getDay();
    const weight = openWeight(weekday);
    const base = booking.weeklySpend * (weight / weekWeight);
    const wobble = base ? 1 + jitter(`${booking.id}:${date.toDateString()}`) * 0.12 : 0;
    const spend = base * wobble;
    const minutes = Math.round(spend / rate);
    rows.push({
      date,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      weekday: DAY_NAMES[weekday],
      open: weight > 0,
      minutes,
      plays: Math.round(minutes * PLAYS_PER_MINUTE),
      spend,
    });
  }
  return rows;
}

/* The hour grid. Each daypart's minutes land evenly across the hours it
   covers, because nothing here counts footfall by the hour and a made-up
   curve would be a lie told in a prettier shape. */
export type HourCell = { hour: number; label: string; minutes: number; tier: 'peak' | 'off' | null };

export function byHour(booking: Bookable, scale = 1): HourCell[] {
  const splits = splitByDaypart(booking, scale);
  const windows: Record<Daypart, number[]> = {
    lunch: [11, 12, 13],
    afternoon: [14, 15, 16],
    evening: [17, 18, 19, 20],
  };

  const cells: HourCell[] = [];
  for (let hour = 11; hour <= 20; hour++) {
    const owner = splits.find((split) => windows[split.id].includes(hour));
    const minutes = owner ? owner.minutes / windows[owner.id].length : 0;
    cells.push({
      hour,
      label: hour > 12 ? `${hour - 12}p` : hour === 12 ? '12p' : `${hour}a`,
      minutes: Math.round(minutes),
      tier: owner?.tier ?? null,
    });
  }
  return cells;
}

/* ---- the headline numbers ------------------------------------------------ */

/** What the TVs actually reported for a campaign. */
export type Measured = {
  plays: number;
  seconds: number;
  /** When the first play landed, or null if none have. */
  since: number | null;
};

export type Totals = {
  running: boolean;
  /** 'log' once TVs have reported plays; 'model' before that. */
  source: 'log' | 'model';
  /** Weeks elapsed since the board started playing it, as a fraction. */
  weeks: number;
  days: number;
  /** Delivered so far if running, or the first week's booking if not. */
  minutes: number;
  plays: number;
  spend: number;
  reach: number;
  /** Cost of one play, and of one minute, on the mix actually bought. */
  perPlay: number;
  perMinute: number;
  /** Cost of a thousand heads past the board. The industry's own yardstick. */
  perThousand: number;
  /** Booked for the week, for pacing against. */
  weeklySpend: number;
  weeklyMinutes: number;
  byPlay: boolean;
  screens: number;
  shops: number;
};

export function totalsOf(booking: Bookable, measured?: Measured | null): Totals {
  const venues = venuesOf(booking);
  const weeks = weeksRunning(booking);
  const running = weeks > 0;
  /* A campaign that has not started shows the week it booked, so the panel is
     a forecast rather than a wall of dashes. Which of the two it is showing is
     `running`, and every surface labels it. */
  const scale = running ? weeks : 1;

  const splits = splitByVenue(booking, scale);
  const minutes = splits.reduce((total, split) => total + split.minutes, 0);
  const plays = splits.reduce((total, split) => total + split.plays, 0);
  const spend = splits.reduce((total, split) => total + split.spend, 0);
  const reach = splits.reduce((total, split) => total + split.reach, 0);
  const weekMinutes = splitByVenue(booking).reduce((total, split) => total + split.minutes, 0);

  /* A play log beats the model. Delivered time and plays are counted; what
     they cost is that count at the rate this booking was priced at, which is
     the same arithmetic the advertiser agreed to. */
  const counted = Boolean(measured && measured.plays > 0);
  const rate = minutes ? spend / minutes : 0;
  const deliveredMinutes = counted ? measured!.seconds / 60 : minutes;
  const deliveredPlays = counted ? measured!.plays : plays;
  const deliveredSpend = counted ? deliveredMinutes * rate : spend;

  return {
    running,
    source: counted ? 'log' : 'model',
    weeks,
    days: daysRunning(booking),
    minutes: deliveredMinutes,
    plays: deliveredPlays,
    spend: deliveredSpend,
    reach,
    perPlay: deliveredPlays ? deliveredSpend / deliveredPlays : 0,
    perMinute: deliveredMinutes ? deliveredSpend / deliveredMinutes : 0,
    perThousand: reach ? (deliveredSpend / reach) * 1000 : 0,
    weeklySpend: booking.weeklySpend,
    weeklyMinutes: weekMinutes,
    byPlay: unitOf(booking.format) === 'play',
    screens: venues.reduce((total, venue) => total + venue.screens, 0),
    shops: venues.length,
  };
}

export function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}
