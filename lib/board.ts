'use client';

/* The shop's own half of the screen.
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

import { useEffect, useState } from 'react';
import { DEFAULT_AD_SHARE } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';

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

/* ---- how the board looks ------------------------------------------------- */

export type ThemeId = 'chalk' | 'enamel' | 'warm' | 'garden';

export const THEMES: { id: ThemeId; label: string; note: string }[] = [
  { id: 'chalk', label: 'Chalk', note: 'White on near-black. Reads from across the room' },
  { id: 'enamel', label: 'Enamel', note: 'Cream and brass, like a painted sign' },
  { id: 'warm', label: 'Warm', note: 'Terracotta and ink, for a room with wood in it' },
  { id: 'garden', label: 'Garden', note: 'Deep green and gold, quieter and a little formal' },
];

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
  /** Where on the screen ads may sit. 'none' means not this week. */
  adPlacement: PlacementId;
  slots: Record<SlotId, MenuSection[]>;
  reviews: { on: boolean; items: Review[] };
  /** A clip of the shop's own food, played between boards. */
  media: { on: boolean; name: string | null; src: string | null };
};

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
    adPlacement: 'rail',
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

/* ---- the store -----------------------------------------------------------
   The signed-in owner's shop and its board, cached for the tab. Edits land in
   the cache at once and reach the table half a second after the last
   keystroke, so typing a menu is not a write per character. */

type Cache = { ready: boolean; shopId: string | null; board: Board };

let cache: Cache = { ready: false, shopId: null, board: starterBoard() };
let loading: Promise<void> | null = null;
let flush: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

/* Boards saved before this stored a percentage instead of a place. Snap the
   old number to the nearest placement so an existing board opens where its
   owner left it rather than back on the default. */
function migrated(saved: Board & { adShare?: number }): Board {
  if (saved.adPlacement) return saved;
  const share = typeof saved.adShare === 'number' ? saved.adShare : DEFAULT_AD_SHARE;
  const nearest = PLACEMENTS.reduce((best, place) =>
    Math.abs(place.share - share) < Math.abs(best.share - share) ? place : best,
  );
  return { ...saved, adPlacement: nearest.id };
}

async function load() {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) {
    cache = { ready: true, shopId: null, board: starterBoard() };
    announce();
    return;
  }
  const { data: shop } = await db
    .from('shops')
    .select('id, boards(board)')
    .eq('owner_id', auth.user.id)
    .limit(1)
    .maybeSingle();
  const row = (shop as { id: string; boards: { board: Board }[] | { board: Board } | null } | null) ?? null;
  const saved = row ? (Array.isArray(row.boards) ? row.boards[0]?.board : row.boards?.board) : null;
  cache = {
    ready: true,
    shopId: row?.id ?? null,
    board: saved ? migrated(saved as Board & { adShare?: number }) : starterBoard(),
  };
  announce();
}

function ensureLoaded() {
  if (!loading) loading = load();
  return loading;
}

/** Drop the cache so the next reader fetches again (after sign-in or out). */
export function reloadBoard() {
  loading = null;
  cache = { ready: false, shopId: null, board: starterBoard() };
  void ensureLoaded();
}

async function persist() {
  const { shopId, board } = cache;
  if (!shopId) return;
  const db = supabase();
  /* The uploaded clip is a data URL and can be tens of megabytes; it does not
     belong in a row. It stays in the cache for this tab's preview only. */
  const stored = { ...board, media: { ...board.media, src: null } };
  await db
    .from('boards')
    .update({ board: stored, updated_at: new Date().toISOString() })
    .eq('shop_id', shopId);
  await db.rpc('bump_board_version', { p_shop_id: shopId });
  await db
    .from('shops')
    .update({ name: board.shopName, ad_placement: board.adPlacement })
    .eq('id', shopId);
}

export function saveBoard(board: Board) {
  cache = { ...cache, board };
  announce();
  if (flush) clearTimeout(flush);
  flush = setTimeout(() => {
    flush = null;
    void persist();
  }, 500);
}

export function resetBoard() {
  saveBoard(starterBoard());
}

/** `ready` stays false through the first paint so the prerender matches. */
export function useBoard(): { ready: boolean; board: Board } {
  const [state, setState] = useState<{ ready: boolean; board: Board }>({
    ready: false,
    board: starterBoard(),
  });

  useEffect(() => {
    void ensureLoaded();
    const sync = () => setState({ ready: cache.ready, board: cache.board });
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return state;
}

/** Items across every board, for a count worth showing. */
export function itemCount(board: Board) {
  return SLOTS.reduce(
    (total, slot) =>
      total + board.slots[slot.id].reduce((n, section) => n + section.items.length, 0),
    0,
  );
}
