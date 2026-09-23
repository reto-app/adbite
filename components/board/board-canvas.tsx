'use client';

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Star } from 'lucide-react';
import {
  layoutOf,
  paletteOf,
  placementById,
  showsMenu,
  type Board,
  type MenuSection,
  type SlotId,
} from '@/lib/board';
import { cssVars } from '@/lib/palette';
import { faceById, load as loadFonts } from '@/lib/fonts';
import { gridFor, rectOf, reconcile, type Block } from '@/lib/layout';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* The shop's board, drawn as it will appear on the wall.
 *
 * Sized in container units rather than pixels, so the same component is the
 * editor's live preview at 700px, the phone's at 340px and the marketing
 * page's example at 400px without a second set of numbers to keep in step.
 * The aspect comes from the shop's own answer about how its TV is hung, so a
 * board turned on its end is drawn on its end here too.
 *
 * Colour and lettering arrive as inline custom properties rather than as a
 * theme class, because a shop can now set them to anything; the theme classes
 * survive only as the four presets those values are seeded from. Everything
 * in the stylesheet still reads `var(--bd-ink)` and neither knows nor cares
 * where the value came from.
 *
 * Two layouts live here. The flowed one — sections into columns — is what a
 * board has until somebody drags something, and it is the one that stays
 * right when a menu grows. The placed one draws blocks at percentages off
 * lib/layout.ts's grid. They render the same section component, so a shop
 * switching between them sees their own menu either way.
 */

export function BoardCanvas({
  board,
  slot,
  /** Draws the ad rail as a labelled placeholder rather than a live spot. */
  showAdLabel = true,
  className,
  /** Laid over the placed layout by the designer: handles, grid, selection. */
  overlay,
  /* A real advertisement in the ad space rather than the labelled hole. The
     advertiser's builder passes their own artwork so they see it where it
     will actually hang; the shop's editor passes nothing and keeps the
     label. A full-screen turn covers the board, because that is what it
     does. */
  ad,
  /* What the screen plays where a menu would be, for a board that has no
     menu. Most screens we sell are that: the shop's own film above the strip
     they sold. Without it this drew an empty menu with "nothing here yet"
     over the top of the slot an advertiser was in the middle of buying. */
  stage,
}: {
  board: Board;
  slot: SlotId;
  showAdLabel?: boolean;
  className?: string;
  overlay?: ReactNode;
  ad?: ReactNode;
  stage?: { url: string; name: string } | null;
}) {
  const t = useCopy(SHARED);
  const film = !showsMenu(board);
  const sections = board.slots[slot] ?? [];
  const place = placementById(board.adPlacement);
  const reviews = board.reviews.on ? board.reviews.items.filter((r) => r.quote.trim()) : [];
  const review = reviews[0];

  const palette = paletteOf(board);
  const display = faceById(board.fonts?.display);
  const body = faceById(board.fonts?.body);
  /* Fetched once per face for the life of the tab. Doing it in an effect
     rather than during render keeps the prerender free of a <link> the
     server has no business adding. */
  useEffect(() => {
    loadFonts(board.fonts?.display, board.fonts?.body);
  }, [board.fonts?.display, board.fonts?.body]);

  const grid = gridFor(board.orientation);
  const saved = layoutOf(board, slot);
  const layout = saved ? reconcile(saved, sections, grid) : null;

  const style = {
    ...cssVars(palette),
    '--bd-display': display.stack,
    '--bd-body': body.stack,
  } as CSSProperties;

  return (
    <div
      className={`board-canvas place-${place.id} orient-${board.orientation ?? 'landscape'}${layout ? ' is-placed' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <div className="board-menu">
        {film ? (
          /* No head, no columns, no review foot: there is nothing written on
             this screen. The strip below is drawn exactly as it is on a menu
             board, because that part is the same product. */
          <div className="board-stage">
            {stage ? (
              <img src={stage.url} alt={stage.name} />
            ) : (
              <span className="board-stage-label">{t.board.filmHere}</span>
            )}
          </div>
        ) : layout ? (
          <div className="board-free">
            {layout.map((block) => (
              <div
                key={block.id}
                className={`board-block bk-${block.kind}`}
                style={
                  {
                    ...rectOf(block, grid),
                    '--bk-scale': block.scale ?? 1,
                    /* About the block's own middle, which is where the
                       designer's turn handle swings from and where the Roku's
                       scaleRotateCenter is set. */
                    ...(block.rotate ? { transform: `rotate(${block.rotate}deg)` } : {}),
                  } as CSSProperties
                }
              >
                <BlockBody block={block} board={board} slot={slot} sections={sections} review={review} />
              </div>
            ))}
            {overlay}
          </div>
        ) : (
          <>
            <BoardHead board={board} slot={slot} />

            <div className="board-cols">
              {sections.map((section) => (
                <SectionBody key={section.id} section={section} />
              ))}
              {sections.length === 0 && <p className="board-blank">{t.board.nothingYet}</p>}
            </div>

            {place.id === 'rotation' && showAdLabel && (
              <p className="board-ad-turn">{t.board.fullTurn}</p>
            )}

            {review && <ReviewBody review={review} />}
          </>
        )}
      </div>

      {/* The rail and the strip are places on the board, so they are drawn on
          it. A full-screen turn is not: it happens between boards, so it is
          said in a line under the menu instead. Blanking the preview to show
          it would hide the very thing being edited. */}
      {(place.id === 'rail' || place.id === 'banner') && (
        <aside className="board-ad">
          {ad ??
            (showAdLabel && (
              <span className="board-ad-label">
                <b>{t.board.adSpace}</b>
                <i>{t.placements[place.id].label}</i>
              </span>
            ))}
        </aside>
      )}

      {place.id === 'rotation' && ad && <div className="board-ad-full">{ad}</div>}

      {board.media.on && (
        <span className="board-media" title={t.board.clipTitle}>
          {t.board.clipInRotation}
        </span>
      )}
    </div>
  );
}

/* ---- the pieces ----------------------------------------------------------
   One component per block kind, shared by both layouts so the flowed board
   and the placed one can never drift into drawing a section two ways. */

function BoardHead({ board, slot }: { board: Board; slot: SlotId }) {
  const t = useCopy(SHARED);
  return (
    <header className="board-head">
      {board.logo && <img className="board-logo" src={board.logo} alt="" />}
      <span className="board-head-words">
        <b>{board.shopName || t.board.yourShop}</b>
        {board.tagline && <span>{board.tagline}</span>}
      </span>
      <i>{t.slots[slot].label}</i>
    </header>
  );
}

function SectionBody({ section }: { section: MenuSection }) {
  return (
    <section>
      {section.image && <img className="board-section-image" src={section.image} alt="" />}
      <h4>{section.title}</h4>
      <ul>
        {section.items
          .filter((entry) => entry.name.trim())
          .map((entry) => (
            <li key={entry.id} className={entry.badge === 'out' ? 'gone' : undefined}>
              <span className="board-item">
                <b>
                  {entry.name}
                  {entry.badge !== 'none' && <Badge badge={entry.badge} />}
                </b>
                {entry.note && <i>{entry.note}</i>}
              </span>
              <span className="board-price">{entry.price}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}

function Badge({ badge }: { badge: 'new' | 'popular' | 'out' | 'none' }) {
  const t = useCopy(SHARED);
  if (badge === 'none') return null;
  return <em className={`board-badge bb-${badge}`}>{t.badges[badge]}</em>;
}

function ReviewBody({ review }: { review: { quote: string; author: string; stars: number; source: string } }) {
  const t = useCopy(SHARED);
  return (
    <footer className="board-review">
      <span className="board-stars" aria-label={t.board.starsOutOf(review.stars)}>
        {Array.from({ length: Math.max(1, Math.min(5, review.stars)) }).map((_, index) => (
          <Star key={index} size={9} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <q>{review.quote}</q>
      <cite>
        {review.author}
        {review.source ? ` · ${review.source}` : ''}
      </cite>
    </footer>
  );
}

function BlockBody({
  block,
  board,
  slot,
  sections,
  review,
}: {
  block: Block;
  board: Board;
  slot: SlotId;
  sections: MenuSection[];
  review?: { quote: string; author: string; stars: number; source: string };
}) {
  const t = useCopy(SHARED);

  if (block.kind === 'head') return <BoardHead board={board} slot={slot} />;

  if (block.kind === 'section') {
    const section = sections.find((entry) => entry.id === block.sectionId);
    /* reconcile() drops a block whose section is gone before this runs, so
       reaching here means the two went out of step inside one render. An
       empty box is a better answer than a thrown component. */
    if (!section) return null;
    return <SectionBody section={section} />;
  }

  if (block.kind === 'image' || block.kind === 'logo') {
    const src = block.kind === 'logo' ? (block.src ?? board.logo) : block.src;
    if (!src) return <span className="board-block-empty">{t.board.pictureHere}</span>;
    return (
      <img
        className="board-block-image"
        src={src}
        alt=""
        style={{ objectFit: block.fit ?? (block.kind === 'logo' ? 'contain' : 'cover'), borderRadius: `${block.round ?? 0}cqw` }}
      />
    );
  }

  if (block.kind === 'text') {
    return (
      <p className={`board-block-text tone-${block.tone ?? 'ink'}`} style={{ textAlign: block.align ?? 'left' }}>
        {block.text || t.board.wordsHere}
      </p>
    );
  }

  if (block.kind === 'reviews') {
    if (!review) return null;
    return <ReviewBody review={review} />;
  }

  return null;
}
