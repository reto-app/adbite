/* The AdBite screen network.
 *
 * One real shop, because that is what the pilot actually is. Everything here
 * is fact (address, coordinates, hours) and nothing is invented. When a
 * second shop signs, add it to VENUES and the whole product picks it up: the
 * map, the campaign builder, and the dashboard all read from this list. */

export type Venue = {
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
    hours: 'Mon–Sat 11am–9pm · closed Sunday',
    screens: 1,
    board: 'Counter menu board',
  },
];

export const PILOT_CITY = 'Provo, Utah';

/* Preferences an advertiser can state. They travel with the booking as a
   request to the shop; none of them is a targeting guarantee, and none is
   backed by measurement we do not have yet. */

export type AgeBand = '18-24' | '25-34' | '35-49' | '50+';
export type Daypart = 'lunch' | 'afternoon' | 'evening';

export const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: '18-24', label: '18–24' },
  { id: '25-34', label: '25–34' },
  { id: '35-49', label: '35–49' },
  { id: '50+', label: '50+' },
];

/* The shop opens at 11, so there is no morning slot to sell. */
export const DAYPARTS: { id: Daypart; label: string; window: string }[] = [
  { id: 'lunch', label: 'Lunch', window: '11am–2pm' },
  { id: 'afternoon', label: 'Afternoon', window: '2pm–5pm' },
  { id: 'evening', label: 'Evening', window: '5pm–9pm' },
];

export function totalScreens(venues: Venue[] = VENUES) {
  return venues.reduce((total, venue) => total + venue.screens, 0);
}
