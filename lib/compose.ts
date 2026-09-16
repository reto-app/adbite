/* The board a TV receives.
 *
 * One function turns what the database holds about a shop into the exact
 * JSON the Roku channel reads (roku/board.json is the reference copy). The
 * dashboard's `Board` type travels through verbatim; around it go the
 * things only the wall needs: the slot clock, the poll interval, and the
 * approved spots with absolute asset URLs plus the hash and size the device
 * verifies each download against.
 *
 * Pure and dependency-free so the same function can run in a Vercel
 * function and, later, in the dashboard's "what the TV will show" preview. */

import type { Board } from './board.js';

/** Share of the screen each placement hands to ads. Mirrors lib/board.ts,
    repeated here so this file has no browser-only imports. */
const SHARE: Record<string, number> = { none: 0, banner: 0.18, rail: 1 / 3, rotation: 0 };

export type Spot = {
  campaignId: string;
  name: string;
  format: 'banner' | 'rail' | 'full' | 'video';
  /** Absolute https URL the device downloads once. */
  src: string;
  sha256: string;
  bytes: number;
  seconds?: number | null;
};

export type ComposeInput = {
  shopId: string;
  board: Board;
  boardVersion: number;
  updatedAt: string;
  spots: Spot[];
  /** Screen role of the device this is for. */
  screen: 'menu' | 'reel';
  pollMinutes: number;
};

/** The wire format. Field names are the channel's, not the dashboard's. */
export type RokuBoard = {
  version: 1;
  exportedAt: string;
  shopId: string;
  boardVersion: number;
  remoteUrl: null;
  refreshMinutes: number;
  keepAwake: boolean;
  textScale: number;
  adLayout: 'rail' | 'banner';
  supplemental: boolean;
  spotSeconds: number;
  reviewSeconds: number;
  slotWindows: { id: string; label: string; startMinute: number; endMinute: number }[];
  board: Omit<Board, 'adPlacement'> & { adShare: number };
  ads: {
    id: string;
    name: string;
    format: Spot['format'];
    src: string;
    sha256: string;
    bytes: number;
    seconds: number;
    chain?: boolean;
    loop?: boolean;
  }[];
};

/* The shop's own boards. Hours will come from the shop row once the
   dashboard edits them; until then these are the windows the sample board
   has always used. */
const DEFAULT_WINDOWS = [
  { id: 'morning', label: 'Breakfast', startMinute: 0, endMinute: 660 },
  { id: 'midday', label: 'Lunch', startMinute: 660, endMinute: 960 },
  { id: 'evening', label: 'Evening', startMinute: 960, endMinute: 1440 },
];

export function compose(input: ComposeInput): RokuBoard {
  const { board } = input;
  const placement = board.adPlacement ?? 'rail';
  const share = SHARE[placement] ?? SHARE.rail;

  /* Which spots can this screen actually show. A rail-only board has nowhere
     to put a banner; 'rotation' and 'none' have no slot at all, so only the
     full-screen formats survive. A reel screen shows nothing but full-screen. */
  const allowed = (format: Spot['format']) => {
    if (input.screen === 'reel') return format === 'full' || format === 'video';
    if (format === 'full' || format === 'video') return placement !== 'none';
    if (placement === 'banner') return format === 'banner';
    if (placement === 'rail') return format === 'rail';
    return false;
  };

  const ads = input.spots
    .filter((spot) => spot.src && spot.sha256 && spot.bytes > 0 && allowed(spot.format))
    .map((spot) => ({
      id: spot.campaignId,
      name: spot.name,
      format: spot.format,
      src: spot.src,
      sha256: spot.sha256,
      bytes: spot.bytes,
      seconds: spot.seconds && spot.seconds >= 2 ? Math.round(spot.seconds) : 15,
    }));

  const { adPlacement: _placement, ...rest } = board;

  return {
    version: 1,
    exportedAt: input.updatedAt,
    shopId: input.shopId,
    boardVersion: input.boardVersion,
    remoteUrl: null,
    refreshMinutes: input.pollMinutes,
    keepAwake: true,
    textScale: 1,
    adLayout: placement === 'banner' ? 'banner' : 'rail',
    supplemental: input.screen === 'reel',
    spotSeconds: 15,
    reviewSeconds: 12,
    slotWindows: DEFAULT_WINDOWS,
    board: { ...rest, adShare: share, media: { ...rest.media, src: null } },
    ads,
  };
}

/** Stable text for hashing: the same board always serialises the same way. */
export function serialize(board: RokuBoard): string {
  return JSON.stringify(board);
}
