'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/components/nav';
import { BoardCanvas } from '@/components/board/board-canvas';
import { SLOTS, THEMES, starterBoard, type SlotId, type ThemeId } from '@/lib/board';

/* The board designer, on the marketing page, running the real component.
 *
 * Not a picture of a menu board: the same `BoardCanvas` the editor previews
 * with, fed the same starter board the editor opens on. Switching the hours or
 * the ground here does exactly what the two controls in the builder do, so the
 * page cannot drift from the product the way a mockup would. */
export function BoardShowcase() {
  const [board] = useState(starterBoard);
  const [slot, setSlot] = useState<SlotId>('midday');
  const [theme, setTheme] = useState<ThemeId>('chalk');

  return (
    <div className="showcase">
      <div className="showcase-screen">
        <BoardCanvas board={{ ...board, theme }} slot={slot} />
      </div>

      <div className="showcase-controls">
        <div className="showcase-set">
          <span className="showcase-label">Different menu, different hour</span>
          <div className="showcase-chips">
            {SLOTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={slot === item.id ? 'on' : undefined}
                aria-pressed={slot === item.id}
                onClick={() => setSlot(item.id)}
              >
                <b>{item.label}</b>
                <i>{item.window}</i>
              </button>
            ))}
          </div>
        </div>

        <div className="showcase-set">
          <span className="showcase-label">And a ground that suits the room</span>
          <div className="showcase-chips themes">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`swatch-chip theme-${item.id}${theme === item.id ? ' on' : ''}`}
                aria-pressed={theme === item.id}
                aria-label={item.label}
                onClick={() => setTheme(item.id)}
              >
                <span className="theme-swatch" aria-hidden="true" />
                <b>{item.label}</b>
              </button>
            ))}
          </div>
        </div>

        <p className="showcase-note">
          Every item, price and section on that screen is typed in a browser and pushed to the TV.
          No design software, no waiting on anyone, no call-out fee. The striped block is the slice
          you are letting ads use, and you set how wide it is &mdash; down to none at all.
        </p>

        <Link className="button invert" href="/dashboard" data-track="tools-open-builder">
          Design a board now <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
