/* Where things sit on the board.
 *
 * Two modes, and the first one is the default because it is the one that
 * cannot go wrong: **laid out for you**, where sections flow into columns and
 * a shop only ever types. The second is **moved by hand**, where every piece
 * is a rectangle on a grid the shop drags around.
 *
 * A board has no layout until somebody drags something. At that moment the
 * flow is frozen into blocks — `fromFlow()` below — so the first thing a shop
 * sees after switching is exactly the board they already had, with handles on
 * it. That matters: an editor that empties the screen the moment you touch it
 * teaches people not to touch it.
 *
 * The grid is sized so a cell is very nearly square on the screen it is drawn
 * on, which is what makes "snap" feel like snapping rather than like sliding.
 * Nothing is measured in pixels: a block is cells, and cells are percentages,
 * so the same numbers drive a 320px phone preview and a 1920px TV.
 *
 * Pure and DOM-free — lib/compose.ts sends this to the wall.
 */

import type { MenuSection } from './board-shape.js';

export type Grid = { cols: number; rows: number };

/* 24 x 14 on a 16:9 screen puts the cell at 1.04:1; 14 x 24 on a 9:16 puts it
   at 0.96:1. Close enough to square in both that a square dragged out stays
   looking square. */
export const GRIDS: Record<'landscape' | 'portrait', Grid> = {
  landscape: { cols: 24, rows: 14 },
  portrait: { cols: 14, rows: 24 },
};

export function gridFor(orientation: 'landscape' | 'portrait' | undefined): Grid {
  return GRIDS[orientation === 'portrait' ? 'portrait' : 'landscape'];
}

export type BlockKind = 'head' | 'section' | 'image' | 'text' | 'reviews' | 'logo';

export type Block = {
  id: string;
  kind: BlockKind;
  /** Top-left cell, and a size in cells. Always inside the grid. */
  x: number;
  y: number;
  w: number;
  h: number;

  /* ---- kind: 'section' */
  /** The id of the MenuSection this draws. Its text is edited in the list. */
  sectionId?: string;

  /* ---- kind: 'image' | 'logo' */
  /** An https URL from the shop's own media. Never a data URL: a board row
      is not a place to keep a photograph. */
  src?: string;
  fit?: 'cover' | 'contain';
  /** Corner rounding, in cells, so it scales with everything else. */
  round?: number;

  /* ---- kind: 'text' */
  text?: string;
  align?: 'left' | 'center' | 'right';
  /** Which of the board's colours this text takes. */
  tone?: 'ink' | 'dim' | 'accent';

  /* ---- every kind */
  /** Type size relative to the block's natural size. 0.6 to 2. */
  scale?: number;
  /** Turned this many degrees clockwise about its own middle. Absent or zero
      is square, which is what almost everything on a board should be: the
      whole point of a turned block is that the one on the wall next to it is
      not. Degrees rather than radians because the number is shown to a shop
      owner and typed by nobody. */
  rotate?: number;
};

export type Layout = Block[];

/** A layout per board, absent while that board is still laid out for you. */
export type Layouts = Partial<Record<string, Layout>>;

/* What the "add something" menu offers. `head` is not in it: every board has
   exactly one name band and it is put there by fromFlow, so offering a second
   would only ever be a mistake. It can be moved and resized like anything
   else, and deleting it is allowed — some shops have the name painted on the
   wall above the screen already. */
export const BLOCK_KINDS: { id: BlockKind; label: string }[] = [
  { id: 'section', label: 'A menu section' },
  { id: 'image', label: 'A picture' },
  { id: 'text', label: 'A line of words' },
  { id: 'logo', label: 'Your logo' },
  { id: 'reviews', label: 'A review' },
  { id: 'head', label: 'Your name and tagline' },
];

/* ---- keeping a block on the board ---------------------------------------- */

/** Half a turn either way, to the degree. A block turned 370 degrees and one
    turned 10 are the same block, and the second is the one to keep. */
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  let turned = Math.round(degrees) % 360;
  if (turned > 180) turned -= 360;
  if (turned <= -180) turned += 360;
  return turned;
}

/** How far a nudge or a snap turns a block. */
export const ROTATE_STEP = 5;

export function clampBlock(block: Block, grid: Grid): Block {
  const w = Math.max(1, Math.min(grid.cols, Math.round(block.w)));
  const h = Math.max(1, Math.min(grid.rows, Math.round(block.h)));
  /* The rectangle stays on the grid; the turn is applied to it afterwards, so
     a corner may hang over the edge of the board exactly as it does in the
     preview. Squaring a turned block up against the edges would be the
     designer quietly undoing what the shop just did. */
  const rotate = normalizeRotation(block.rotate ?? 0);
  return {
    ...block,
    w,
    h,
    ...(rotate === 0 ? { rotate: undefined } : { rotate }),
    x: Math.max(0, Math.min(grid.cols - w, Math.round(block.x))),
    y: Math.max(0, Math.min(grid.rows - h, Math.round(block.y))),
  };
}

/** Percentages, which is all the renderer needs. */
export function rectOf(block: Block, grid: Grid) {
  return {
    left: `${(block.x / grid.cols) * 100}%`,
    top: `${(block.y / grid.rows) * 100}%`,
    width: `${(block.w / grid.cols) * 100}%`,
    height: `${(block.h / grid.rows) * 100}%`,
  };
}

/** Somewhere free for a new block, scanning left to right and down. Falls
    back to the top-left corner on a full board rather than refusing to add. */
export function findSpace(layout: Layout, grid: Grid, w: number, h: number): { x: number; y: number } {
  const taken = (x: number, y: number) =>
    layout.some((block) => x < block.x + block.w && x + w > block.x && y < block.y + block.h && y + h > block.y);
  for (let y = 0; y + h <= grid.rows; y += 1) {
    for (let x = 0; x + w <= grid.cols; x += 1) {
      if (!taken(x, y)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

/* ---- freezing the automatic layout ---------------------------------------
   The flow lays sections into two columns (one, on a screen turned on its
   end) under a header band, with a review along the foot. This reproduces
   that arrangement as rectangles, weighting each section by how many items
   it holds so a section of nine does not come out the same height as a
   section of two. It will not be pixel-identical to the flowed board, and it
   does not need to be — it needs to be recognisably the same board. */

export function fromFlow(
  sections: MenuSection[],
  options: { grid: Grid; hasReviews: boolean; columns?: number },
): Layout {
  const { grid, hasReviews } = options;
  const columns = options.columns ?? (grid.cols >= 20 ? 2 : 1);

  /* The band the header occupies in the flowed board, near enough. */
  const headHeight = Math.max(2, Math.round(grid.rows * 0.16));
  const footHeight = hasReviews ? Math.max(1, Math.round(grid.rows * 0.1)) : 0;
  const bodyTop = headHeight;
  const bodyHeight = Math.max(1, grid.rows - headHeight - footHeight);

  const blocks: Layout = [
    { id: 'b-head', kind: 'head', x: 0, y: 0, w: grid.cols, h: headHeight },
  ];
  if (sections.length === 0) return blocks;

  /* Deal sections into columns by weight rather than by count, so two short
     sections and one long one do not leave half a column empty. */
  const weight = (section: MenuSection) => 1 + Math.max(1, section.items.filter((i) => i.name.trim()).length);
  const lanes: { sections: MenuSection[]; weight: number }[] = Array.from({ length: columns }, () => ({
    sections: [],
    weight: 0,
  }));
  for (const section of sections) {
    const lane = lanes.reduce((lightest, entry) => (entry.weight < lightest.weight ? entry : lightest));
    lane.sections.push(section);
    lane.weight += weight(section);
  }

  const colWidth = Math.floor(grid.cols / columns);
  lanes.forEach((lane, index) => {
    const total = lane.weight || 1;
    let y = bodyTop;
    lane.sections.forEach((section, position) => {
      const last = position === lane.sections.length - 1;
      const h = last
        ? Math.max(1, bodyTop + bodyHeight - y)
        : Math.max(1, Math.round((weight(section) / total) * bodyHeight));
      blocks.push(
        clampBlock(
          {
            id: `b-${section.id}`,
            kind: 'section',
            sectionId: section.id,
            x: index * colWidth,
            y,
            w: index === columns - 1 ? grid.cols - index * colWidth : colWidth,
            h,
          },
          grid,
        ),
      );
      y += h;
    });
  });

  if (hasReviews && footHeight > 0) {
    blocks.push(
      clampBlock(
        { id: 'b-reviews', kind: 'reviews', x: 0, y: grid.rows - footHeight, w: grid.cols, h: footHeight },
        grid,
      ),
    );
  }

  return blocks;
}

/* A layout goes stale when the menu under it does: a section deleted in the
   list leaves a block pointing at nothing, and a section added in the list
   has no block at all. Rather than making the two editors police each other,
   the renderer and the designer both run this first. */
export function reconcile(layout: Layout, sections: MenuSection[], grid: Grid): Layout {
  const ids = new Set(sections.map((section) => section.id));
  const kept = layout.filter((block) => block.kind !== 'section' || (block.sectionId && ids.has(block.sectionId)));
  const placed = new Set(kept.filter((block) => block.kind === 'section').map((block) => block.sectionId));

  const added = sections
    .filter((section) => !placed.has(section.id))
    .map((section) => {
      const w = Math.max(4, Math.round(grid.cols / 2));
      const h = Math.max(3, Math.min(grid.rows, 2 + section.items.length));
      const { x, y } = findSpace(kept, grid, w, h);
      const block: Block = { id: `b-${section.id}`, kind: 'section', sectionId: section.id, x, y, w, h };
      kept.push(clampBlock(block, grid));
      return block;
    });

  return added.length === 0 && kept.length === layout.length ? layout : kept;
}
