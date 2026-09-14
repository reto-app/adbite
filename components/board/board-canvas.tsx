'use client';

import { Star } from 'lucide-react';
import { SLOTS, type Board, type SlotId } from '@/lib/board';

/* The shop's board, drawn as it will appear on the wall.
 *
 * Sized in container units rather than pixels, so the same component is the
 * editor's live preview at 700px and the marketing page's example at 400px
 * without a second set of numbers to keep in step. */

const BADGE_TEXT: Record<string, string> = {
  new: 'New',
  popular: 'Popular',
  out: 'Sold out',
};

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
  const sections = board.slots[slot] ?? [];
  const share = Math.max(0, Math.min(0.5, board.adShare));
  const adWidth = share * 100;
  const reviews = board.reviews.on ? board.reviews.items.filter((r) => r.quote.trim()) : [];
  const review = reviews[0];

  return (
    <div className={`board-canvas theme-${board.theme}${className ? ` ${className}` : ''}`}>
      <div className="board-menu" style={{ width: `${100 - adWidth}%` }}>
        <header className="board-head">
          <b>{board.shopName || 'Your shop'}</b>
          {board.tagline && <span>{board.tagline}</span>}
          <i>{SLOTS.find((s) => s.id === slot)?.label}</i>
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
                              {BADGE_TEXT[entry.badge]}
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
          {sections.length === 0 && <p className="board-blank">Nothing on this board yet.</p>}
        </div>

        {review && (
          <footer className="board-review">
            <span className="board-stars" aria-label={`${review.stars} out of 5`}>
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

      {share > 0 && (
        <aside className="board-ad" style={{ width: `${adWidth}%` }}>
          {showAdLabel && (
            <span className="board-ad-label">
              <b>Ad space</b>
              <i>{Math.round(share * 100)}% of the screen</i>
            </span>
          )}
        </aside>
      )}

      {board.media.on && (
        <span className="board-media" title="Your own clip plays between boards">
          Your clip is in the rotation
        </span>
      )}
    </div>
  );
}
