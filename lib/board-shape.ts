/* The shop's own half of the screen — its shape, its defaults, and the one
 * function that turns a database row back into it.
 *
 * Deliberately free of React, of Supabase and of the `@/` alias: a Vercel
 * function reads the same rows this file describes and sends them to a TV, and
 * it cannot import anything with a browser in it. The store that caches and
 * saves a board lives next door in lib/board.ts, which re-exports everything
 * here, so nothing that imports `@/lib/board` has to know about the split.
 *
 * The shop's own half of the screen.
 *
 * AdBite sells a slice of a menu board, which means the shop has to have a
 * menu board worth reading in the first place. This is that: the sections, the
 * items, the prices, the hours each board runs, and where on the screen the
 * shop is willing to let ads sit.
 *
 * It lives in the `boards` table, one row per shop, and is seeded with a
 * real-looking starter board when a shop owner first picks their side, so the
 * editor opens on something to edit rather than on an empty grid. Saves are
 * written through with a short debounce; the TV reads the same row. */

import { DEFAULT_AD_SHARE } from './pricing.js';
import { DEFAULT_FONTS, isFontId, type FontPair } from './fonts.js';
import { isHex, THEME_COLORS, type PaletteChoice } from './palette.js';
import { gridFor, type Layout, type Layouts } from './layout.js';

/* ---- when each board runs ------------------------------------------------
   These are the shop's own boards, not the ad rate card's dayparts. A shop
   changes its board because breakfast stops at eleven, not because the price
   of a minute moves at two. Keeping them separate stops one from being quietly
   used as the other. */

export type SlotId = 'morning' | 'midday' | 'evening';

export const SLOTS: { id: SlotId; label: string; window: string; note: string }[] = [
  { id: 'morning', label: 'Breakfast', window: 'Open until 11am', note: 'Pastry, coffee, the early trade' },
  { id: 'midday', label: 'Lunch', window: '11am until 4pm', note: 'The queue board. Most of the week is here' },
  { id: 'evening', label: 'Evening', window: '4pm until close', note: 'Bigger plates, the late menu' },
];

export function slotById(id: SlotId) {
  return SLOTS.find((slot) => slot.id === id) ?? SLOTS[1];
}

/* The slot a wall is showing at this moment, off the same windows the channel
   switches on (DEFAULT_WINDOWS in lib/compose.ts). Used where the answer has
   to be what is on the screen right now rather than what somebody is editing:
   an advertiser looking at a board they are about to buy a place on. */
export function slotNow(at: Date = new Date()): SlotId {
  const minutes = at.getHours() * 60 + at.getMinutes();
  if (minutes < 11 * 60) return 'morning';
  if (minutes < 16 * 60) return 'midday';
  return 'evening';
}

/* ---- where the ads sit ---------------------------------------------------
   A shop picks a place on its screen, not a percentage. "A fifth of the
   board" is not a thing anyone can picture standing in their own shop, but
   "a strip along the bottom" is, and it is the same decision. The share each
   placement works out to lives here beside it and is read by lib/pricing.ts,
   so the shop never has to hold a number in their head to be paid correctly. */

export type PlacementId = 'none' | 'banner' | 'rail' | 'rotation';

export const PLACEMENTS: {
  id: PlacementId;
  label: string;
  /** For the tight spaces: a dashboard stat, a money-tab caption. */
  short: string;
  note: string;
  /** Share of screen time this placement hands to ads. */
  share: number;
}[] = [
  {
    id: 'none',
    label: 'Nowhere this week',
    short: 'Nowhere',
    note: 'The whole screen stays yours. Nothing is booked, and nothing is paid.',
    share: 0,
  },
  {
    id: 'banner',
    label: 'A strip along the bottom',
    short: 'Bottom strip',
    note: 'A band under your menu. Everything you wrote stays readable.',
    share: 0.18,
  },
  {
    id: 'rail',
    label: 'A rail down the right',
    short: 'Right rail',
    note: 'The right third, top to bottom. Your menu keeps the rest of the board.',
    share: DEFAULT_AD_SHARE,
  },
  {
    id: 'rotation',
    label: 'Between your boards',
    short: 'Between boards',
    note: 'The full screen for one turn of the rotation, then your menu is back.',
    share: 0.42,
  },
];

export function placementById(id: PlacementId) {
  return PLACEMENTS.find((place) => place.id === id) ?? PLACEMENTS[2];
}

/** What the pricing code needs. Nothing renders this. */
export function shareOf(id: PlacementId) {
  return placementById(id).share;
}

/* ---- what kind of board this is -------------------------------------------
   Not every screen is a menu. A shop is asked once, in its own words, what
   the screen is for, because the answer changes what the editor should even
   show them: a display board has no prices to type, and a shop running its
   own film should not be handed an empty menu grid. */

export type BoardKind = 'menu' | 'special' | 'display';

export const BOARD_KINDS: { id: BoardKind; label: string; blurb: string; example: string }[] = [
  {
    id: 'menu',
    label: 'A menu',
    blurb: 'What you sell and what it costs, in sections your customers read while they queue.',
    example: 'Tacos, burritos, drinks, with prices',
  },
  {
    id: 'special',
    label: 'A specials board',
    blurb: 'A few things at a time rather than the whole list. Today, this week, while it lasts.',
    example: "Today's three specials, the soup, the happy hour",
  },
  {
    id: 'display',
    label: 'A display screen',
    blurb: 'No prices. Your own photos and film, playing on a loop for the room to look at.',
    example: 'Your food, your work, your team, your hours',
  },
];

export function boardKindById(id: BoardKind) {
  return BOARD_KINDS.find((kind) => kind.id === id) ?? BOARD_KINDS[0];
}

/* Whether this screen has a menu on it at all.
 *
 * This used to be `source === 'media'` alone, which meant a shop that said
 * their screen was a display -- no prices, their own photos and film -- was
 * still handed an empty menu grid to fill in and shown a preview of a menu
 * board they had never asked for. The kind is the answer to "what is this
 * screen for", so it decides, and the source only decides how a menu gets
 * filled when there is one. */
export function showsMenu(board: Pick<Board, 'kind' | 'source'>) {
  return board.kind !== 'display' && board.source === 'builder';
}

/* Where the shop's half of the screen comes from: the editor in this
   dashboard, or files they upload. Independent of the kind, because a menu
   can be a photograph of a hand-written board and a display screen can be
   typed. */
export type BoardSource = 'builder' | 'media';

export const BOARD_SOURCES: { id: BoardSource; label: string; blurb: string }[] = [
  {
    id: 'builder',
    label: 'Build it here',
    blurb: 'Type your sections and prices and we lay them out. Change them from your phone whenever you like.',
  },
  {
    id: 'media',
    label: 'Upload my own',
    blurb: 'Your own images and video, played in a loop. Use this if your board is already designed, or if the screen is not a menu at all.',
  },
];

/* ---- which way up the TV is ---------------------------------------------
   Most counter screens are hung landscape, but a board squeezed beside a till
   or behind a coffee machine is often turned on its end, and the editor was
   drawing every one of them 16:9. The shop says which, once, and the preview,
   the ad slot and the screen itself follow. */

export type Orientation = 'landscape' | 'portrait';

export const ORIENTATIONS: { id: Orientation; label: string; note: string }[] = [
  { id: 'landscape', label: 'Landscape', note: 'Hung the usual way round. 16:9' },
  { id: 'portrait', label: 'Portrait', note: 'Turned on its end, taller than wide. 9:16' },
];

/* Which way a portrait TV was turned: with its top edge now on the viewer's
   left, or on their right. A Roku cannot rotate video, so every film for a
   portrait screen is rotated in the file, and the file has to be rotated the
   way the panel was. Wrong, and the ad is upside down. */
export type Turn = 'left' | 'right';

export const TURNS: { id: Turn; label: string; note: string }[] = [
  { id: 'left', label: 'Top to the left', note: 'Turned anticlockwise' },
  { id: 'right', label: 'Top to the right', note: 'Turned clockwise' },
];

/* ---- how the board looks ------------------------------------------------- */

export type ThemeId = 'chalk' | 'enamel' | 'warm' | 'garden';

export const THEMES: { id: ThemeId; label: string; note: string }[] = [
  { id: 'chalk', label: 'Chalk', note: 'White on near-black. Reads from across the room' },
  { id: 'enamel', label: 'Enamel', note: 'Cream and brass, like a painted sign' },
  { id: 'warm', label: 'Warm', note: 'Terracotta and ink, for a room with wood in it' },
  { id: 'garden', label: 'Garden', note: 'Deep green and gold, quieter and a little formal' },
];

/* The three colours each theme starts from live in lib/palette.ts, which is
   DOM-free and browser-free so lib/compose.ts can resolve the same palette on
   its way to a TV. Re-exported here because this is where a shop's board is
   defined and where anyone would look for them. */
export { paletteChoice, paletteOf, THEME_COLORS } from './palette.js';

/** Whether this board has been recoloured away from its theme. */
export function isRecoloured(board: Pick<Board, 'theme' | 'palette'>): boolean {
  const base = THEME_COLORS[board.theme] ?? THEME_COLORS.chalk;
  const custom = board.palette;
  if (!custom) return false;
  return (
    (isHex(custom.bg) && custom.bg !== base.bg) ||
    (isHex(custom.ink) && custom.ink !== base.ink) ||
    (isHex(custom.accent) && custom.accent !== base.accent) ||
    isHex(custom.dim) ||
    isHex(custom.rule)
  );
}

/* ---- the menu ------------------------------------------------------------ */

export type Badge = 'none' | 'new' | 'popular' | 'out';

export const BADGES: { id: Badge; label: string }[] = [
  { id: 'none', label: 'No tag' },
  { id: 'new', label: 'New' },
  { id: 'popular', label: 'Popular' },
  { id: 'out', label: 'Sold out' },
];

export type MenuItem = {
  id: string;
  name: string;
  note: string;
  /** Kept as typed text, not a number: "5", "5.50", "12 / 20" are all real. */
  price: string;
  badge: Badge;
};

export type MenuSection = {
  id: string;
  title: string;
  items: MenuItem[];
  /** A photograph beside the section, in the automatic layout. An https URL
      from the shop's own media — never a data URL, which would put a
      megabyte of base64 into a row every TV downloads. */
  image?: string | null;
};

export type Review = {
  id: string;
  quote: string;
  author: string;
  stars: number;
  source: string;
};

export type Board = {
  shopName: string;
  tagline: string;
  theme: ThemeId;
  /* Colours the shop set itself, over the top of the theme. Any field left
     null falls back to the theme, which is why this is a partial and not a
     full palette: a shop that only changed the accent has changed only the
     accent, and a later tweak to a theme still reaches them. */
  palette: Partial<PaletteChoice> | null;
  /** The two faces the board is set in. */
  fonts: FontPair;
  /** The shop's mark, drawn in the header. An https URL or null. */
  logo: string | null;
  /** Which way the TV is hung. */
  orientation: Orientation;
  /** For a portrait TV, which way it was turned. Ignored when landscape. */
  turn: Turn;
  /** What the screen is for. Null until the shop has been asked. */
  kind: BoardKind | null;
  /** Whether the shop's half is typed here or uploaded. */
  source: BoardSource;
  /** Where on the screen ads may sit. 'none' means not this week. */
  adPlacement: PlacementId;
  slots: Record<SlotId, MenuSection[]>;
  /* Hand placement, per board, and absent until a shop drags something.
     Absent is the good case: it means the sections flow themselves and stay
     right when the menu changes under them. See lib/layout.ts. */
  layouts: Layouts;
  reviews: { on: boolean; items: Review[] };
  /** A clip of the shop's own food, played between boards. */
  media: { on: boolean; name: string | null; src: string | null };
};

/** The hand-placed layout for one board, or null while it lays itself out. */
export function layoutOf(board: Board, slot: SlotId): Layout | null {
  return board.layouts?.[slot] ?? null;
}

export function isFreeform(board: Board, slot: SlotId): boolean {
  return Array.isArray(board.layouts?.[slot]);
}

export function withLayout(board: Board, slot: SlotId, layout: Layout | null): Board {
  const layouts = { ...board.layouts };
  if (layout === null) delete layouts[slot];
  else layouts[slot] = layout;
  return { ...board, layouts };
}

/** The cell grid this board's screen is divided into. */
export function gridOf(board: Board) {
  return gridFor(board.orientation);
}

let seq = 0;
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

export function emptyItem(): MenuItem {
  return { id: newId('i'), name: '', note: '', price: '', badge: 'none' };
}

export function emptySection(): MenuSection {
  return { id: newId('s'), title: 'New section', items: [emptyItem()] };
}

/* ---- the starter board ---------------------------------------------------
   Bao Pao Wow's real menu, because a shop owner reading this will recognise a
   board off their own street, and an editor that opens on Lorem Ipsum teaches
   nobody what the tool does. */

function item(name: string, note: string, price: string, badge: Badge = 'none'): MenuItem {
  return { id: newId('i'), name, note, price, badge };
}

export function starterBoard(): Board {
  return {
    shopName: 'Bao Pao Wow',
    tagline: 'Filipino steamed buns · 660 N Freedom Blvd',
    theme: 'chalk',
    palette: null,
    fonts: { ...DEFAULT_FONTS },
    logo: null,
    orientation: 'landscape',
    turn: 'left',
    /* Null on purpose: the dashboard asks before it assumes. */
    kind: null,
    source: 'builder',
    adPlacement: 'rail',
    layouts: {},
    slots: {
      morning: [
        {
          id: newId('s'),
          title: 'Early',
          items: [
            item('Pandesal basket', 'Four warm rolls, salted butter', '4'),
            item('Longganisa plate', 'Garlic rice, fried egg', '9', 'popular'),
            item('Champorado', 'Chocolate rice porridge', '6'),
          ],
        },
        {
          id: newId('s'),
          title: 'Coffee',
          items: [
            item('Barako drip', 'Strong, local beans', '3'),
            item('Iced kapeng puti', 'Condensed milk', '4.50'),
          ],
        },
      ],
      midday: [
        {
          id: newId('s'),
          title: 'Buns',
          items: [
            item('Pork asado bao', 'Braised shoulder, hoisin', '5', 'popular'),
            item('Chicken adobo bao', 'Soy, vinegar, black pepper', '5'),
            item('Crispy pata bao', 'Pork knuckle, pickled radish', '6', 'new'),
            item('Ube + cheese bao', 'Sweet, for after', '4'),
          ],
        },
        {
          id: newId('s'),
          title: 'Plates',
          items: [
            item('Sisig rice bowl', 'Chopped pork, calamansi, egg', '12'),
            item('Pancit bihon', 'Rice noodles, cabbage, lemon', '10'),
            item('Lumpia, six', 'Sweet chilli on the side', '7'),
          ],
        },
        {
          id: newId('s'),
          title: 'Drinks',
          items: [
            item('Calamansi soda', 'House-pressed', '4'),
            item('Sago at gulaman', 'Brown sugar, pandan jelly', '5'),
            item('Bottled water', '', '2'),
          ],
        },
      ],
      evening: [
        {
          id: newId('s'),
          title: 'Bigger plates',
          items: [
            item('Kare-kare', 'Oxtail, peanut, bagoong', '18', 'popular'),
            item('Crispy pata', 'Whole knuckle, to share', '24'),
            item('Bangus belly', 'Grilled, garlic rice', '16'),
          ],
        },
        {
          id: newId('s'),
          title: 'Late buns',
          items: [
            item('Pork asado bao', 'Braised shoulder, hoisin', '5'),
            item('Ube + cheese bao', 'Sweet, for after', '4'),
          ],
        },
      ],
    },
    reviews: {
      on: true,
      items: [
        {
          id: newId('r'),
          quote: 'The crispy pata bao is the best thing I have eaten in Provo this year.',
          author: 'Dani R.',
          stars: 5,
          source: 'Google',
        },
        {
          id: newId('r'),
          quote: 'Tiny place, enormous flavour. The sisig bowl is worth the queue.',
          author: 'Marcus T.',
          stars: 5,
          source: 'Yelp',
        },
        {
          id: newId('r'),
          quote: 'Went for one bun. Left with four and a soda.',
          author: 'Priya N.',
          stars: 4,
          source: 'Google',
        },
      ],
    },
    media: { on: false, name: null, src: null },
  };
}

/* What comes back out of the `boards` table, made safe to render.
 *
 * This is the boundary between a JSON column and a React tree, and it is the
 * only place that can be. A row is whatever was written to it by whatever
 * version of this app was running at the time — plus, in practice, whatever a
 * seeding script or a migration left behind. The editor reads
 * `board.slots[slot]` roughly everywhere, so one missing key here is a white
 * screen, and the field that is missing is never the one you expected.
 *
 * So: every field is checked, not just the ones that are new. Anything the
 * row does have is kept — this fills gaps, it never replaces a board — and
 * anything it does not have comes from the starter board. A row of `{}` is a
 * valid input and produces the starter board rather than a crash.
 *
 * Exported so it can be tested against a junk row without going through a
 * database, which is the only way anyone is going to check it.
 */
export function migrated(saved: (Partial<Board> & { adShare?: number }) | null | undefined): Board {
  const fallback = starterBoard();
  if (!saved || typeof saved !== 'object') return fallback;

  const text = (value: unknown, instead: string) => (typeof value === 'string' ? value : instead);
  const one = <T,>(value: unknown, allowed: readonly T[], instead: T): T =>
    (allowed as readonly unknown[]).includes(value) ? (value as T) : instead;

  /* The three boards, each an array. A slot the row is missing is empty
     rather than the starter board's own menu: a shop whose lunch board was
     written and whose breakfast board was not has an empty breakfast board,
     and handing them somebody else's pastries would be worse than a blank. */
  const slots = {} as Board['slots'];
  for (const slot of SLOTS) {
    const sections = (saved.slots as Board['slots'] | undefined)?.[slot.id];
    slots[slot.id] = Array.isArray(sections) ? sections.filter((section) => section && Array.isArray(section.items)) : [];
  }
  /* Except when the row has no `slots` at all, which is a board that was
     never written rather than one that was written empty. */
  const written = saved.slots && typeof saved.slots === 'object';

  /* Hand placement, per board. A layout that is not an array is dropped, and
     dropping it means that board lays itself out again — which is the safe
     failure, not a broken one. */
  const layouts: Board['layouts'] = {};
  if (saved.layouts && typeof saved.layouts === 'object') {
    for (const [slot, layout] of Object.entries(saved.layouts)) {
      if (Array.isArray(layout) && layout.every((block) => block && typeof block.id === 'string')) {
        layouts[slot] = layout;
      }
    }
  }

  const reviews = saved.reviews;
  const media = saved.media;

  return {
    shopName: text(saved.shopName, fallback.shopName),
    tagline: text(saved.tagline, ''),
    theme: one(saved.theme, THEMES.map((entry) => entry.id), 'chalk'),
    palette: saved.palette && typeof saved.palette === 'object' ? saved.palette : null,
    fonts: {
      display: isFontId(saved.fonts?.display) ? saved.fonts.display : DEFAULT_FONTS.display,
      body: isFontId(saved.fonts?.body) ? saved.fonts.body : DEFAULT_FONTS.body,
    },
    logo: typeof saved.logo === 'string' ? saved.logo : null,
    orientation: one(saved.orientation, ORIENTATIONS.map((entry) => entry.id), 'landscape'),
    turn: one(saved.turn, TURNS.map((entry) => entry.id), 'left'),
    /* A board saved before the question existed is a menu built here, which
       is what every board was then, and its owner is not asked again. A row
       that was never written at all has not been asked yet. */
    kind: saved.kind === undefined ? (written ? 'menu' : null) : one(saved.kind, [...BOARD_KINDS.map((entry) => entry.id), null], null),
    source: one(saved.source, BOARD_SOURCES.map((entry) => entry.id), 'builder'),
    adPlacement: placementFor(saved),
    slots: written ? slots : fallback.slots,
    layouts,
    /* A row with a menu in it but no reviews has no reviews. A row with
       nothing in it has never been written, and gets the whole starter board
       rather than the starter menu with its reviews stripped off. */
    reviews: written
      ? {
          on: typeof reviews?.on === 'boolean' ? reviews.on : false,
          items: Array.isArray(reviews?.items) ? reviews.items : [],
        }
      : fallback.reviews,
    media: {
      on: typeof media?.on === 'boolean' ? media.on : false,
      name: typeof media?.name === 'string' ? media.name : null,
      src: typeof media?.src === 'string' ? media.src : null,
    },
  };
}

/* Boards saved before this stored a percentage instead of a place. Snap the
   old number to the nearest placement so an existing board opens where its
   owner left it rather than back on the default. */
function placementFor(saved: Partial<Board> & { adShare?: number }): PlacementId {
  if (saved.adPlacement && PLACEMENTS.some((place) => place.id === saved.adPlacement)) return saved.adPlacement;
  const share = typeof saved.adShare === 'number' ? saved.adShare : DEFAULT_AD_SHARE;
  return PLACEMENTS.reduce((best, place) =>
    Math.abs(place.share - share) < Math.abs(best.share - share) ? place : best,
  ).id;
}

/** Items across every board, for a count worth showing. */
export function itemCount(board: Board) {
  return SLOTS.reduce(
    (total, slot) =>
      total + board.slots[slot.id].reduce((n, section) => n + section.items.length, 0),
    0,
  );
}
