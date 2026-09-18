/* The AdBite screen network.
 *
 * The pilot sells Salt Lake, Utah and Cache counties, and the boards go in a
 * few at a time. Only the shops carrying `status: 'live'` are actually
 * running; everything the site says about inventory, earnings and how many
 * screens are up is counted off that flag, so the copy grows with the network
 * instead of having to be rewritten. Bao Pao Wow is fact: address,
 * coordinates, hours and board are all real.
 *
 * Everything else in VENUES is a stand-in. Those shops carry
 * `status: 'prospect'` and exist so the campaign builder can be exercised the
 * way it will work once the network fills in: picking several shops at once,
 * taking a whole neighbourhood, drawing a radius around your own storefront.
 * The UI labels them as prospects wherever they appear and refuses to price a
 * booking against them. When one of them signs, flip its status to 'live' and
 * the whole product picks it up: the map, the builder, the dashboard, and
 * every price on the site, which lib/pricing.ts derives from this list. */

import { DEFAULT_AD_SHARE, type Priceable } from '@/lib/pricing';

/** Live shops carry real bookings. Prospects are the pipeline, and are drawn
    but never charged for. */
export type VenueStatus = 'live' | 'prospect';

export type Venue = Priceable & {
  id: string;
  name: string;
  kind: string;
  /** Which collection this shop books under. See GROUPS. */
  group: GroupId;
  /** Which part of town it sits in. See NEIGHBORHOODS. */
  area: AreaId;
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
  /** When the board went live, or when we expect it to. */
  since: string;
  status: VenueStatus;
  /** Rough heads past the board in a week. A planning figure, not a count. */
  footfall: number;
  /* Permanent bottom-banner spots already sold on this board. Maintained by
     hand for the pilot, the way `status` and `since` are: an advertiser can
     only see their own bookings through row-level security, so a count of
     everyone's cannot be worked out in the browser. It moves to a view over
     the campaigns table when the pilot ends. Absent means none sold. */
  spotsTaken?: number;
};

/* ---- how shops are grouped ---------------------------------------------- */

export type GroupId = 'food' | 'coffee' | 'grooming' | 'fitness' | 'retail';

export const GROUPS: { id: GroupId; label: string; blurb: string }[] = [
  { id: 'food', label: 'Restaurants', blurb: 'Counter menu boards, lunch and dinner queues' },
  { id: 'coffee', label: 'Cafés & bakeries', blurb: 'Mornings, laptops, long dwell' },
  { id: 'grooming', label: 'Barbers & salons', blurb: 'Waiting chairs, twenty minutes a head' },
  { id: 'fitness', label: 'Gyms & studios', blurb: 'Lobby screens, members most days' },
  { id: 'retail', label: 'Shops & services', blurb: 'Tills, counters, walk-in trade' },
];

export type AreaId =
  | 'provo'
  | 'springville'
  | 'spanishfork'
  | 'americanfork'
  | 'lindon'
  | 'saratoga'
  | 'saltlake';

/* Areas are towns now rather than parts of Provo: the network runs the
   length of the Wasatch Front, and a shop is in Lindon or Springville before
   it is in a neighbourhood. Labels are in lib/copy/shared.ts under `areas`. */
export const NEIGHBORHOODS: {
  id: AreaId;
  label: string;
  blurb: string;
  /** Where the map lands when you pick this area. */
  at: [number, number];
  zoom: number;
}[] = [
  { id: 'provo', label: 'Provo', blurb: 'University Parkway and Center Street', at: [40.2455, -111.6625], zoom: 13 },
  { id: 'springville', label: 'Springville', blurb: 'North Main, by the freeway', at: [40.1808, -111.6116], zoom: 14 },
  { id: 'spanishfork', label: 'Spanish Fork', blurb: 'Main Street', at: [40.115, -111.6549], zoom: 14 },
  { id: 'americanfork', label: 'American Fork', blurb: 'State Street, downtown', at: [40.3772, -111.7974], zoom: 14 },
  { id: 'lindon', label: 'Lindon', blurb: 'State Street', at: [40.34, -111.72], zoom: 14 },
  { id: 'saratoga', label: 'Saratoga Springs', blurb: 'Redwood Road', at: [40.366, -111.8985], zoom: 14 },
  { id: 'saltlake', label: 'Salt Lake City', blurb: 'The Granary, west of downtown', at: [40.7623, -111.901], zoom: 14 },
];

/* The shops on the network. Every one is a real restaurant; addresses are as
   listed by the business. `status` says whether its board is up: live shops
   carry bookings, prospects hold a place on a request until their screen is.

   Thai Papaya was seeded under the id `baopaowow` before it had its own
   entry; the shop row and its bookings were renamed with it. */
export const VENUES: Venue[] = [
  {
    id: 'thai-papaya',
    name: 'Thai Papaya Cuisine',
    kind: 'Thai',
    group: 'food',
    area: 'provo',
    street: '1774 N University Pkwy, Ste 28',
    city: 'Provo, UT 84604',
    at: [40.2581, -111.6647],
    phone: '801.607.1693',
    site: 'thai-papaya-cuisine-provo-8.webnode.page',
    hours: 'Mon-Sat 11am-9pm · closed Sunday',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'September 2026',
    status: 'live',
    footfall: 2400,
  },
  {
    id: 'el-tio',
    name: 'El Tio Taco',
    kind: 'Mexican',
    group: 'food',
    area: 'provo',
    street: '1774 N University Pkwy, Ste 4',
    city: 'Provo, UT 84604',
    at: [40.2583, -111.664],
    phone: '',
    site: '',
    hours: 'Mon-Sat 11am-9pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 2200,
  },
  {
    id: 'yummys',
    name: 'Yummy’s Korean BBQ & Sushi',
    kind: 'Korean BBQ and sushi',
    group: 'food',
    area: 'provo',
    street: '198 W Center St',
    city: 'Provo, UT 84601',
    at: [40.2338, -111.6615],
    phone: '801.769.6614',
    site: 'yummysutah.com',
    hours: 'Mon-Thu 11:30am-2pm, 5-8pm · Fri-Sat 11:30am-9pm · closed Sunday',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 2600,
  },
  {
    id: 'el-chaval',
    name: 'El Chaval',
    kind: 'Mexican',
    group: 'food',
    area: 'spanishfork',
    street: '',
    city: 'Spanish Fork, UT 84660',
    at: [40.115, -111.6549],
    phone: '',
    site: '',
    hours: 'Mon-Sat 11am-9pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 2000,
  },
  {
    id: 'don-joaquin-provo',
    name: 'Don Joaquín Street Tacos · Provo',
    kind: 'Street tacos',
    group: 'food',
    area: 'provo',
    street: '150 W 1230 N',
    city: 'Provo, UT 84604',
    at: [40.2519, -111.662],
    phone: '801.400.2894',
    site: 'donjoaquinstreettacos.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 4800,
  },
  {
    id: 'don-joaquin-springville',
    name: 'Don Joaquín Street Tacos · Springville',
    kind: 'Street tacos',
    group: 'food',
    area: 'springville',
    street: '1180 N Main St',
    city: 'Springville, UT 84663',
    at: [40.1808, -111.6116],
    phone: '801.491.6252',
    site: 'donjoaquinstreettacos.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 3600,
  },
  {
    id: 'don-joaquin-american-fork',
    name: 'Don Joaquín Street Tacos · American Fork',
    kind: 'Street tacos',
    group: 'food',
    area: 'americanfork',
    street: '74 N West State St',
    city: 'American Fork, UT 84003',
    at: [40.3772, -111.7974],
    phone: '385.498.3758',
    site: 'donjoaquinstreettacos.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 3800,
  },
  {
    id: 'don-joaquin-lindon',
    name: 'Don Joaquín Street Tacos · Lindon',
    kind: 'Street tacos',
    group: 'food',
    area: 'lindon',
    street: '131 S State St',
    city: 'Lindon, UT 84042',
    at: [40.339, -111.717],
    phone: '',
    site: 'donjoaquinstreettacos.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 3200,
  },
  {
    id: 'don-joaquin-saratoga',
    name: 'Don Joaquín Street Tacos · Saratoga Springs',
    kind: 'Street tacos',
    group: 'food',
    area: 'saratoga',
    street: '1168 N Redwood Rd',
    city: 'Saratoga Springs, UT 84045',
    at: [40.366, -111.8985],
    phone: '385.498.3758',
    site: 'donjoaquinstreettacos.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 3400,
  },
  {
    id: 'don-joaquin-salt-lake',
    name: 'Don Joaquín Street Tacos · Salt Lake City',
    kind: 'Street tacos',
    group: 'food',
    area: 'saltlake',
    street: '423 W 300 S',
    city: 'Salt Lake City, UT 84101',
    at: [40.7623, -111.901],
    phone: '385.528.1171',
    site: 'donjoaquinstreettacos.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 1,
    board: 'Counter display',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 5200,
  },
];

export const PILOT_CITY = 'Provo, Utah';

/** The shops a booking can actually run on today. */
export const LIVE_VENUES = VENUES.filter((venue) => venue.status === 'live');

export function venueById(id: string) {
  return VENUES.find((venue) => venue.id === id);
}

export function venuesByIds(ids: string[]) {
  return VENUES.filter((venue) => ids.includes(venue.id));
}

export function groupLabel(id: GroupId) {
  return GROUPS.find((group) => group.id === id)?.label ?? id;
}

export function areaLabel(id: AreaId) {
  return NEIGHBORHOODS.find((area) => area.id === id)?.label ?? id;
}

/* ---- geometry, for drawing a selection on the map ----------------------- */

const EARTH_KM = 6371;

/** Great-circle distance in kilometres. */
export function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function venuesWithin(centre: [number, number], km: number, from: Venue[] = VENUES) {
  return from.filter((venue) => distanceKm(centre, venue.at) <= km);
}

/** Ray casting on raw lat/lng. The shapes are a few blocks across, so the
    flat-earth error is far smaller than the click that drew them. */
export function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const crosses =
      yi > point[0] !== yj > point[0] &&
      point[1] < ((xj - xi) * (point[0] - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function venuesInPolygon(polygon: [number, number][], from: Venue[] = VENUES) {
  return from.filter((venue) => pointInPolygon(venue.at, polygon));
}

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

export function totalFootfall(venues: Venue[] = VENUES) {
  return venues.reduce((total, venue) => total + venue.footfall, 0);
}

/* Dayparts moved to lib/pricing.ts when they stopped being a preference and
   started being a price. Re-exported so callers need only one import. */
export { DAYPARTS, type Daypart } from '@/lib/pricing';
