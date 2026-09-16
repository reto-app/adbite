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

export type AreaId = 'downtown' | 'campus' | 'riverwoods' | 'eastbay' | 'northorem';

export const NEIGHBORHOODS: {
  id: AreaId;
  label: string;
  blurb: string;
  /** Where the map lands when you pick this area. */
  at: [number, number];
  zoom: number;
}[] = [
  {
    id: 'downtown',
    label: 'Downtown Provo',
    blurb: 'Center Street and the blocks either side',
    at: [40.2338, -111.6585],
    zoom: 15,
  },
  {
    id: 'campus',
    label: 'BYU campus',
    blurb: 'Freedom Blvd up to the north gate',
    at: [40.2478, -111.6555],
    zoom: 15,
  },
  {
    id: 'eastbay',
    label: 'East Bay',
    blurb: 'The industrial and big-box strip south of centre',
    at: [40.2121, -111.6421],
    zoom: 15,
  },
  {
    id: 'riverwoods',
    label: 'Riverwoods',
    blurb: 'The Orem end of University Parkway',
    at: [40.3086, -111.6747],
    zoom: 15,
  },
  {
    id: 'northorem',
    label: 'North Orem',
    blurb: 'State Street between 800 and 1600 North',
    at: [40.3205, -111.6946],
    zoom: 15,
  },
];

export const VENUES: Venue[] = [
  /* ---- the one that is actually running ---- */
  {
    id: 'baopaowow',
    name: 'Bao Pao Wow',
    kind: 'Filipino steamed buns',
    group: 'food',
    area: 'campus',
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
    status: 'live',
    footfall: 2400,
  },

  /* ---- prospects: drawn, selectable, never charged ---- */
  {
    id: 'centerst-pizza',
    name: 'Center Street Pie',
    kind: 'Neapolitan by the slice',
    group: 'food',
    area: 'downtown',
    street: '164 W Center St',
    city: 'Provo, UT 84601',
    at: [40.2337, -111.6612],
    phone: '801.555.0142',
    site: 'centerstreetpie.com',
    hours: 'Daily 11am-10pm',
    screens: 2,
    board: 'Twin counter boards',
    daysOpen: 7,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 5200,
  },
  {
    id: 'startup-coffee',
    name: 'Startup Coffee',
    kind: 'Third-wave espresso bar',
    group: 'coffee',
    area: 'downtown',
    street: '111 E 100 N',
    city: 'Provo, UT 84606',
    at: [40.2361, -111.6562],
    phone: '801.555.0118',
    site: 'startupcoffee.co',
    hours: 'Mon-Sat 6:30am-6pm',
    screens: 1,
    board: '43" board behind the bar',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 3800,
  },
  {
    id: 'provo-barber-co',
    name: 'Provo Barber Co.',
    kind: 'Fades and hot-towel shaves',
    group: 'grooming',
    area: 'downtown',
    street: '43 N University Ave',
    city: 'Provo, UT 84601',
    at: [40.2345, -111.6548],
    phone: '801.555.0176',
    site: 'provobarber.co',
    hours: 'Tue-Sat 9am-7pm',
    screens: 1,
    board: 'Waiting-wall screen',
    daysOpen: 5,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 1100,
  },
  {
    id: 'mural-bakery',
    name: 'Mural Bakehouse',
    kind: 'Morning pastry and sourdough',
    group: 'coffee',
    area: 'downtown',
    street: '210 W Center St',
    city: 'Provo, UT 84601',
    at: [40.2338, -111.6634],
    phone: '801.555.0133',
    site: 'muralbakehouse.com',
    hours: 'Tue-Sun 7am-3pm',
    screens: 1,
    board: 'Portrait board at the till',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 2900,
  },
  {
    id: 'cougar-wings',
    name: 'Cougar Wing House',
    kind: 'Wings, fries, game nights',
    group: 'food',
    area: 'campus',
    street: '1200 N Canyon Rd',
    city: 'Provo, UT 84604',
    at: [40.2534, -111.6462],
    phone: '801.555.0155',
    site: 'cougarwings.com',
    hours: 'Mon-Sat 11am-11pm',
    screens: 3,
    board: 'Three-panel menu wall',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 7400,
  },
  {
    id: 'north-gate-poke',
    name: 'North Gate Poke',
    kind: 'Build-your-own poke bowls',
    group: 'food',
    area: 'campus',
    street: '1774 N University Pkwy',
    city: 'Provo, UT 84604',
    at: [40.2581, -111.6647],
    phone: '801.555.0191',
    site: 'northgatepoke.com',
    hours: 'Mon-Sat 11am-9pm',
    screens: 1,
    board: 'Counter menu board',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 3100,
  },
  {
    id: 'campus-cuts',
    name: 'Campus Cuts',
    kind: 'Student barbershop',
    group: 'grooming',
    area: 'campus',
    street: '1200 N 900 E',
    city: 'Provo, UT 84604',
    at: [40.2527, -111.6395],
    phone: '801.555.0164',
    site: 'campuscuts.com',
    hours: 'Mon-Sat 10am-8pm',
    screens: 1,
    board: 'Waiting-wall screen',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 1600,
  },
  {
    id: 'summit-strength',
    name: 'Summit Strength',
    kind: '24-hour gym',
    group: 'fitness',
    area: 'campus',
    street: '875 N Freedom Blvd',
    city: 'Provo, UT 84604',
    at: [40.2461, -111.6623],
    phone: '801.555.0107',
    site: 'summitstrength.fit',
    hours: 'Open 24 hours',
    screens: 2,
    board: 'Lobby and stretch-floor screens',
    daysOpen: 7,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 4600,
  },
  {
    id: 'eastbay-taqueria',
    name: 'East Bay Taqueria',
    kind: 'Al pastor and birria',
    group: 'food',
    area: 'eastbay',
    street: '1774 S State St',
    city: 'Provo, UT 84606',
    at: [40.2114, -111.6438],
    phone: '801.555.0125',
    site: 'eastbaytaqueria.com',
    hours: 'Mon-Sat 10am-10pm',
    screens: 2,
    board: 'Wide board over the counter',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 6100,
  },
  {
    id: 'bay-lube',
    name: 'Bay Auto Care',
    kind: 'Oil change and tyres',
    group: 'retail',
    area: 'eastbay',
    street: '1450 S University Ave',
    city: 'Provo, UT 84601',
    at: [40.2167, -111.6579],
    phone: '801.555.0188',
    site: 'bayautocare.com',
    hours: 'Mon-Fri 8am-6pm · Sat 9am-3pm',
    screens: 1,
    board: 'Waiting-room screen',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 1900,
  },
  {
    id: 'eastbay-smoothie',
    name: 'Bay Blend',
    kind: 'Smoothies and açaí',
    group: 'coffee',
    area: 'eastbay',
    street: '1200 S State St',
    city: 'Provo, UT 84606',
    at: [40.2198, -111.6445],
    phone: '801.555.0172',
    site: 'bayblend.com',
    hours: 'Mon-Sat 7am-8pm',
    screens: 1,
    board: 'Counter menu board',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 2700,
  },
  {
    id: 'riverwoods-ramen',
    name: 'Riverwoods Ramen',
    kind: 'Tonkotsu and gyoza',
    group: 'food',
    area: 'riverwoods',
    street: '4801 N University Ave',
    city: 'Provo, UT 84604',
    at: [40.3081, -111.6723],
    phone: '801.555.0149',
    site: 'riverwoodsramen.com',
    hours: 'Mon-Sat 11am-10pm',
    screens: 2,
    board: 'Twin portrait boards',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 5800,
  },
  {
    id: 'riverwoods-nails',
    name: 'Willow Nail Studio',
    kind: 'Nails and lashes',
    group: 'grooming',
    area: 'riverwoods',
    street: '4801 N University Ave, Ste 720',
    city: 'Provo, UT 84604',
    at: [40.3098, -111.6759],
    phone: '801.555.0115',
    site: 'willownailstudio.com',
    hours: 'Mon-Sat 10am-7pm',
    screens: 1,
    board: 'Portrait board at reception',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 1400,
  },
  {
    id: 'orem-burrito',
    name: 'State Street Burrito',
    kind: 'Late-night burritos',
    group: 'food',
    area: 'northorem',
    street: '1140 S State St',
    city: 'Orem, UT 84097',
    at: [40.3188, -111.6938],
    phone: '801.555.0198',
    site: 'statestburrito.com',
    hours: 'Daily 10am-1am',
    screens: 1,
    board: 'Wide board over the counter',
    daysOpen: 7,
    adShare: DEFAULT_AD_SHARE,
    since: 'In conversation',
    status: 'prospect',
    footfall: 6600,
  },
  {
    id: 'orem-pilates',
    name: 'Northline Pilates',
    kind: 'Reformer studio',
    group: 'fitness',
    area: 'northorem',
    street: '1450 N State St',
    city: 'Orem, UT 84057',
    at: [40.3241, -111.6952],
    phone: '801.555.0136',
    site: 'northlinepilates.com',
    hours: 'Mon-Sat 6am-8pm',
    screens: 1,
    board: 'Lobby screen',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 1200,
  },
  {
    id: 'orem-hardware',
    name: 'Timp Hardware',
    kind: 'Neighbourhood hardware',
    group: 'retail',
    area: 'northorem',
    street: '980 N State St',
    city: 'Orem, UT 84057',
    at: [40.3157, -111.6944],
    phone: '801.555.0159',
    site: 'timphardware.com',
    hours: 'Mon-Sat 7am-8pm',
    screens: 1,
    board: 'Board above the till',
    daysOpen: 6,
    adShare: DEFAULT_AD_SHARE,
    since: 'Waitlist',
    status: 'prospect',
    footfall: 3300,
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
