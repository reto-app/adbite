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

/** A shop's approved spots stitched into one file by the render worker. */
export type Reel = { src: string; sha256: string; bytes: number; seconds: number };

/** A shop's own picture or film: part of the rotation, billed to nobody. */
export type OwnMedia = {
  id: string;
  name: string;
  kind: 'image' | 'video';
  src: string;
  sha256: string;
  bytes: number;
  seconds: number;
};

export type ComposeInput = {
  shopId: string;
  board: Board;
  boardVersion: number;
  updatedAt: string;
  spots: Spot[];
  /** Screen role of the device this is for. */
  screen: 'menu' | 'reel';
  /** Only used by a reel screen, and only when the worker has built one. */
  reel?: Reel | null;
  /** The shop's own media, mixed into the rotation ahead of the advertising. */
  media?: OwnMedia[];
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
  /* On a screen hung on its end there is no rail: a column down one side of
     a portrait board is a sliver. The dashboard draws both placements as a
     strip along the foot, so the wall does the same. */
  const portrait = board.orientation === 'portrait';
  const strip = portrait && placement !== 'none' && placement !== 'rotation';

  /* Which spots can this screen actually show. A rail-only board has nowhere
     to put a banner; 'rotation' and 'none' have no slot at all, so only the
     full-screen formats survive. A reel screen shows nothing but full-screen. */
  const allowed = (format: Spot['format']) => {
    if (input.screen === 'reel') return format === 'full' || format === 'video';
    if (format === 'full' || format === 'video') return placement !== 'none';
    if (strip || placement === 'banner') return format === 'banner';
    if (placement === 'rail') return format === 'rail';
    return false;
  };

  /* A second screen plays one stitched file on a loop: no rotation, no
     re-opening between clips, and therefore no dark gap. Until the worker has
     built it the screen falls through to the ordinary full-screen rotation,
     which is a worse picture but not a blank wall. */
  if (input.screen === 'reel' && input.reel) {
    const { adPlacement: _unused, ...board } = input.board;
    return {
      version: 1,
      exportedAt: input.updatedAt,
      shopId: input.shopId,
      boardVersion: input.boardVersion,
      remoteUrl: null,
      refreshMinutes: input.pollMinutes,
      /* Roku forbids an app from interfering with the system screensaver, so
         a board that must stay up asks the shop to switch the screensaver
         off in the TV's own settings instead. */
      keepAwake: false,
      textScale: 1,
      adLayout: 'rail',
      supplemental: true,
      spotSeconds: 15,
      reviewSeconds: 12,
      slotWindows: DEFAULT_WINDOWS,
      board: { ...board, adShare: 0, media: { ...board.media, src: null } },
      ads: [
        {
          /* Not a campaign id: this one file is several campaigns, and the
             server splits the time it reports across them. */
          id: 'reel',
          name: `${board.shopName} reel`,
          format: 'video',
          src: input.reel.src,
          sha256: input.reel.sha256,
          bytes: input.reel.bytes,
          seconds: Math.round(input.reel.seconds),
          loop: true,
        },
      ],
    };
  }

  /* The shop's own media leads, then what it was paid to carry: a board
     should read as the shop's, with advertising in it. An id of `media-...`
     is never a campaign id, which is how the server knows not to bill the
     time it reports. */
  const own = (input.media ?? [])
    .filter((item) => item.src && item.sha256 && item.bytes > 0)
    .map((item) => ({
      id: `media-${item.id}`,
      name: item.name,
      format: 'video' as const,
      src: item.src,
      sha256: item.sha256,
      bytes: item.bytes,
      seconds: Math.max(2, Math.round(item.seconds)),
      chain: true,
    }));

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
  /* A shop that uploads its board has no menu for us to lay out, so the
     screen is all rotation, the same shape a second screen uses. */
  const uploaded = board.source === 'media';

  return {
    version: 1,
    exportedAt: input.updatedAt,
    shopId: input.shopId,
    boardVersion: input.boardVersion,
    remoteUrl: null,
    refreshMinutes: input.pollMinutes,
    keepAwake: false,
    textScale: 1,
    adLayout: strip || placement === 'banner' ? 'banner' : 'rail',
    supplemental: input.screen === 'reel' || uploaded,
    spotSeconds: 15,
    reviewSeconds: 12,
    slotWindows: DEFAULT_WINDOWS,
    board: { ...rest, adShare: share, media: { ...rest.media, src: null } },
    ads: [...own, ...ads],
  };
}

/** Stable text for hashing: the same board always serialises the same way. */
export function serialize(board: RokuBoard): string {
  return JSON.stringify(board);
}
