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

import { migrated, shareOf, type Board } from './board-shape.js';
import { filesFor, type FontFiles } from './board-fonts.js';
import { gridFor } from './layout.js';
import { paletteOf, toRokuColor, type Palette } from './palette.js';

/* A file the device downloads and verifies before it draws anything with it.
   The same three fields the ad path has always used, so one routine on the
   channel handles every one of them. */
export type Asset = { src: string; sha256: string; bytes: number };

/* A picture on the board: the shop's logo, a photo beside a section, or an
   image block in a hand-placed layout. `url` is what the board's own fields
   say; `src` is what the device rewrites to a local path once the file has
   landed. The two are separate because the board is full of references to the
   URL and rewriting every one of them on the device would mean walking three
   nested structures on every poll. */
export type Picture = Asset & { url: string };

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
  /* The `boards.board` column as it comes out of the database, not a Board.
     compose() runs it through migrated() itself, so a row written by an older
     dashboard — or a half-written one — reaches a TV as the same board the
     editor would show its owner. */
  board: Partial<Board> | null;
  boardVersion: number;
  updatedAt: string;
  spots: Spot[];
  /** Screen role of the device this is for. */
  screen: 'menu' | 'reel';
  /** Only used by a reel screen, and only when the worker has built one. */
  reel?: Reel | null;
  /* Hash and size for every picture in the shop's library, keyed by the URL
     the board refers to it by. A board picture with no entry here is dropped
     rather than sent: a device cannot verify what it was not told the size
     of, and an unverified file is one this product does not put on a wall. */
  pictures?: Map<string, { sha256: string; bytes: number }>;
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
  /* The board's colours, resolved here and sent as 0xRRGGBBAA so the channel
     does no colour maths of its own. A shop can now set these to anything, so
     the four themes hardcoded in roku/components/theme.brs stopped being the
     whole answer; they survive there only as the fallback for a board saved
     before this field existed. */
  palette: Record<keyof Palette, string>;
  /* The grid a hand-placed board is laid out on. Sent rather than assumed so
     the channel does not carry a second copy of lib/layout.ts's numbers. */
  grid: { cols: number; rows: number };
  /** Every picture the board refers to, for the device to fetch and verify. */
  pictures: Picture[];
  /* The two faces the shop chose, as files. Null means the system font, which
     is also what a device falls back to if the download fails. */
  fontFiles: { display: FontFiles | null; body: FontFiles | null };
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

/** The resolved palette in the only colour literal a Roku understands. */
function wirePalette(board: Board): Record<keyof Palette, string> {
  const palette = paletteOf(board);
  return {
    bg: toRokuColor(palette.bg),
    ink: toRokuColor(palette.ink),
    accent: toRokuColor(palette.accent),
    dim: toRokuColor(palette.dim),
    rule: toRokuColor(palette.rule),
    ad: toRokuColor(palette.ad),
    onAccent: toRokuColor(palette.onAccent),
  };
}

/* Every picture this board refers to, once each, in the order a shop would
   meet them: the logo, then the photos beside sections, then the image blocks
   in any hand-placed layout.

   A picture with no hash and size is left out rather than sent. The channel
   verifies every byte it downloads against those two numbers and will not
   draw a file that fails, so sending one it cannot check would only ever
   produce a board that is missing a picture and a line in a log. */
function picturesIn(board: Board, known: ComposeInput['pictures']): Picture[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith('http') && !urls.includes(value)) {
      urls.push(value);
    }
  };

  add(board.logo);
  for (const sections of Object.values(board.slots ?? {})) {
    for (const section of sections ?? []) add(section.image);
  }
  for (const layout of Object.values(board.layouts ?? {})) {
    for (const block of layout ?? []) add(block.src);
  }

  return urls
    .map((url) => {
      const file = known?.get(url);
      return file ? { url, src: url, sha256: file.sha256, bytes: file.bytes } : null;
    })
    .filter((picture): picture is Picture => picture !== null);
}

function fontFilesFor(board: Board): RokuBoard['fontFiles'] {
  return {
    display: filesFor(board.fonts?.display),
    body: filesFor(board.fonts?.body),
  };
}

export function compose(input: ComposeInput): RokuBoard {
  /* The row, not the caller's word for it. `boards.board` is a JSON column
     and what comes out of it is whatever version of the dashboard last wrote
     it — or, once, a seeding script that wrote `{}`. migrated() is the same
     function the editor reads a board through, so the TV and the dashboard
     cannot disagree about what a half-written row means. */
  const board = migrated(input.board);
  const placement = board.adPlacement;
  /* 'rotation' takes the whole screen for one turn rather than a slice of
     every board, so its share of the *menu* board is zero. shareOf() answers
     the pricing question instead, which is a different one. */
  const share = placement === 'rotation' ? 0 : shareOf(placement);
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
    const { adPlacement: _unused, ...rest } = board;
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
      palette: wirePalette(board),
      grid: gridFor(board.orientation),
      /* A reel screen draws no menu, so it needs neither the pictures nor the
         faces — and downloading a megabyte of TTF for a screen that will
         never print a word in it is a megabyte off the shop's uplink. */
      pictures: [],
      fontFiles: { display: null, body: null },
      board: { ...rest, adShare: 0, media: { ...rest.media, src: null } },
      ads: [
        {
          /* Not a campaign id: this one file is several campaigns, and the
             server splits the time it reports across them. */
          id: 'reel',
          name: `${rest.shopName} reel`,
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
    palette: wirePalette(board),
    grid: gridFor(board.orientation),
    /* A board the shop uploaded is all rotation and draws no menu either. */
    pictures: uploaded ? [] : picturesIn(board, input.pictures),
    fontFiles: uploaded ? { display: null, body: null } : fontFilesFor(board),
    board: { ...rest, adShare: share, media: { ...rest.media, src: null } },
    ads: [...own, ...ads],
  };
}

/** Stable text for hashing: the same board always serialises the same way. */
export function serialize(board: RokuBoard): string {
  return JSON.stringify(board);
}
