'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/components/nav';
import { BoardCanvas } from '@/components/board/board-canvas';
import { SLOTS, THEMES, starterBoard, type SlotId, type ThemeId } from '@/lib/board';
import { useCopy } from '@/lib/lang';
import { HOME } from '@/lib/copy/home';
import { SHARED } from '@/lib/copy/shared';

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
  const t = useCopy(HOME).tools.showcase;
  const shared = useCopy(SHARED);

  return (
    <div className="showcase">
      <div className="showcase-screen">
        <BoardCanvas board={{ ...board, theme, palette: null }} slot={slot} />
      </div>

      <div className="showcase-controls">
        <div className="showcase-set">
          <span className="showcase-label">{t.hour}</span>
          <div className="showcase-chips">
            {SLOTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={slot === item.id ? 'on' : undefined}
                aria-pressed={slot === item.id}
                onClick={() => setSlot(item.id)}
              >
                <b>{shared.slots[item.id].label}</b>
                <i>{shared.slots[item.id].window}</i>
              </button>
            ))}
          </div>
        </div>

        <div className="showcase-set">
          <span className="showcase-label">{t.ground}</span>
          <div className="showcase-chips themes">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`swatch-chip theme-${item.id}${theme === item.id ? ' on' : ''}`}
                aria-pressed={theme === item.id}
                aria-label={shared.themes[item.id].label}
                onClick={() => setTheme(item.id)}
              >
                <span className="theme-swatch" aria-hidden="true" />
                <b>{shared.themes[item.id].label}</b>
              </button>
            ))}
          </div>
        </div>

        <p className="showcase-note">{t.note}</p>

        <Link className="button invert" href="/dashboard" data-track="tools-open-builder">
          {t.cta} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
