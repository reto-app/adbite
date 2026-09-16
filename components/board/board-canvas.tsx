'use client';

import { Star } from 'lucide-react';
import { placementById, type Board, type SlotId } from '@/lib/board';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* The shop's board, drawn as it will appear on the wall.
 *
 * Sized in container units rather than pixels, so the same component is the
 * editor's live preview at 700px and the marketing page's example at 400px
 * without a second set of numbers to keep in step. */

export function BoardCanvas({
  board,
  slot,
  /** Draws the ad rail as a labelled placeholder rather than a live spot. */
  showAdLabel = true,
  className,
}: {
  board: Board;
  slot: SlotId;
  showAdLabel?: boolean;
  className?: string;
}) {
  const t = useCopy(SHARED);
  const sections = board.slots[slot] ?? [];
  const place = placementById(board.adPlacement);
  const reviews = board.reviews.on ? board.reviews.items.filter((r) => r.quote.trim()) : [];
  const review = reviews[0];

  return (
    <div
      className={`board-canvas theme-${board.theme} place-${place.id}${className ? ` ${className}` : ''}`}
    >
      <div className="board-menu">
        <header className="board-head">
          <b>{board.shopName || t.board.yourShop}</b>
          {board.tagline && <span>{board.tagline}</span>}
          <i>{t.slots[slot].label}</i>
        </header>

        <div className="board-cols">
          {sections.map((section) => (
            <section key={section.id}>
              <h4>{section.title}</h4>
              <ul>
                {section.items
                  .filter((entry) => entry.name.trim())
                  .map((entry) => (
                    <li key={entry.id} className={entry.badge === 'out' ? 'gone' : undefined}>
                      <span className="board-item">
                        <b>
                          {entry.name}
                          {entry.badge !== 'none' && (
                            <em className={`board-badge bb-${entry.badge}`}>
                              {t.badges[entry.badge]}
                            </em>
                          )}
                        </b>
                        {entry.note && <i>{entry.note}</i>}
                      </span>
                      <span className="board-price">{entry.price}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          {sections.length === 0 && <p className="board-blank">{t.board.nothingYet}</p>}
        </div>

        {place.id === 'rotation' && showAdLabel && (
          <p className="board-ad-turn">{t.board.fullTurn}</p>
        )}

        {review && (
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
        )}
      </div>

      {/* The rail and the strip are places on the board, so they are drawn on
          it. A full-screen turn is not: it happens between boards, so it is
          said in a line under the menu instead. Blanking the preview to show
          it would hide the very thing being edited. */}
      {(place.id === 'rail' || place.id === 'banner') && (
        <aside className="board-ad">
          {showAdLabel && (
            <span className="board-ad-label">
              <b>{t.board.adSpace}</b>
              <i>{t.placements[place.id].label}</i>
            </span>
          )}
        </aside>
      )}

      {board.media.on && (
        <span className="board-media" title={t.board.clipTitle}>
          {t.board.clipInRotation}
        </span>
      )}
    </div>
  );
}
