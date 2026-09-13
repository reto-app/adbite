/* The AdBite screen network.
 *
 * One real shop, because that is what the pilot actually is. Everything here
 * is fact (address, coordinates, hours) and nothing is invented. When a
 * second shop signs, add it to VENUES and the whole product picks it up: the
 * map, the campaign builder, the dashboard, and every price on the site, which
 * is derived from this list by lib/pricing.ts. */

import { DEFAULT_AD_SHARE, type Priceable } from '@/lib/pricing';

export type Venue = Priceable & {
  id: string;
  name: string;
  kind: string;
  street: string;
  city: string;
  /** [latitude, longitude], as geocoded from the street address. */
  at: [number, number];
  phone: string;
  site: string;
  hours: string;
  /** Boards AdBite runs in this shop. */
  screens: number;
  board: string;
  /** Days a week the shop is open, which is what its inventory is priced on. */
  daysOpen: number;
  /** When the board went live. */
  since: string;
};

export const VENUES: Venue[] = [
  {
    id: 'baopaowow',
    name: 'Bao Pao Wow',
    kind: 'Filipino steamed buns',
    street: '660 N Freedom Blvd',
    city: 'Provo, UT 84601',
    at: [40.242636, -111.66201],
    phone: '510.504.4222',
    site: 'baopaowow.com',
    hours: 'Mon-Sat 11am-9pm · closed Sunday',
    screens: 1,
    board: 'Counter menu board',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'September 2026',
  },
];

export const PILOT_CITY = 'Provo, Utah';

/* An advertiser can state who they hope to reach. It travels with the booking
   as a request; it is not a targeting guarantee and nothing measures it. */

export type AgeBand = '18-24' | '25-34' | '35-49' | '50+';

export const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-49', label: '35-49' },
  { id: '50+', label: '50+' },
];

export function totalScreens(venues: Venue[] = VENUES) {
  return venues.reduce((total, venue) => total + venue.screens, 0);
}

/* Dayparts moved to lib/pricing.ts when they stopped being a preference and
   started being a price. Re-exported so callers need only one import. */
export { DAYPARTS, type Daypart } from '@/lib/pricing';
