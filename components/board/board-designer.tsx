'use client';

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { RotateCw, Trash2 } from 'lucide-react';
import {
  ROTATE_STEP,
  clampBlock,
  normalizeRotation,
  rectOf,
  type Block,
  type Grid,
  type Layout,
} from '@/lib/layout';
import { useCopy } from '@/lib/lang';
import { SHOP } from '@/lib/copy/shop';

/* Moving things around the board.
 *
 * An overlay, not a set of draggable board pieces: the board draws itself
 * exactly as the TV will, and this sits on top of it with the handles. That
 * split is the whole reason the preview stays honest — nothing a shop drags
 * can change how the board is rendered, only where the rectangle is.
 *
 * Pointer events throughout, so a finger, a pen and a mouse are one code
 * path; `setPointerCapture` means a fast drag that leaves the board still
 * tracks, and `touch-action: none` on the handles stops a phone reading a
 * drag as a scroll. Everything snaps to the grid on the way, because a menu
 * board that is three pixels out of square is worse than one that is on a
 * coarse grid, and nobody is going to nudge pixels on a phone.
 *
 * Three things can be dragged on a selected block and they are the three
 * things a rectangle has: where it is, how big it is, and which way it faces.
 * The turn grip swings from the block's middle and snaps to five degrees,
 * with shift for single degrees, which is the same bargain the grid makes —
 * coarse by default so a finger cannot miss, fine on purpose. Beside it is
 * the bin, because the moment somebody wants a block gone is the moment they
 * have hold of it, and until now that meant selecting it here and then
 * finding the same block again in the panel below.
 *
 * Keyboard does everything the pointer does: arrows move the selected block,
 * shift+arrows resize it, alt+arrows turn it. Drag is the one genuinely
 * spatial task in this product and it is not going to be the one thing only a
 * mouse can do.
 */

type Drag =
  | {
      id: string;
      mode: 'move' | 'resize';
      /** Where the block was when the drag started. */
      from: { x: number; y: number; w: number; h: number };
      /** Pointer position at the start, in cells. */
      originX: number;
      originY: number;
      moved: boolean;
    }
  | {
      id: string;
      mode: 'turn';
      /** The angle the block was already at. */
      from: number;
      /** The bearing from the block's middle to the pointer at the start. */
      originAngle: number;
      moved: boolean;
    };

/** The bearing from a point to the pointer, in degrees, clockwise from noon. */
function bearing(centreX: number, centreY: number, atX: number, atY: number) {
  return (Math.atan2(atY - centreY, atX - centreX) * 180) / Math.PI + 90;
}

export function BoardDesigner({
  layout,
  grid,
  selected,
  onSelect,
  onChange,
  nameOf,
}: {
  layout: Layout;
  grid: Grid;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (layout: Layout) => void;
  /** What to call a block on its tag. The parent knows the section titles. */
  nameOf: (block: Block) => string;
}) {
  const t = useCopy(SHOP).design;
  const surface = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  /* Pointer position as a fractional cell, which is what makes the snap feel
     like a snap: the block follows the finger continuously in the maths and
     only the rounded result is ever drawn. */
  const cellsAt = (event: ReactPointerEvent) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - box.left) / box.width) * grid.cols,
      y: ((event.clientY - box.top) / box.height) * grid.rows,
    };
  };

  /* The middle of a block in client pixels, which is what a turn swings
     around. Taken off the surface rather than off the handle's own box: a
     rotated element's bounding box is bigger than the element, so its centre
     is the only part of it that can be trusted. */
  const centreOf = (block: Block) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: box.left + ((block.x + block.w / 2) / grid.cols) * box.width,
      y: box.top + ((block.y + block.h / 2) / grid.rows) * box.height,
    };
  };

  const put = (id: string, patch: Partial<Block>) =>
    onChange(layout.map((block) => (block.id === id ? clampBlock({ ...block, ...patch }, grid) : block)));

  const remove = (id: string) => {
    onChange(layout.filter((entry) => entry.id !== id));
    onSelect(null);
  };

  const start = (event: ReactPointerEvent, block: Block, mode: 'move' | 'resize' | 'turn') => {
    /* A right-click or a second finger mid-drag is not a new drag. */
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    onSelect(block.id);

    if (mode === 'turn') {
      const centre = centreOf(block);
      setDrag({
        id: block.id,
        mode,
        from: block.rotate ?? 0,
        originAngle: bearing(centre.x, centre.y, event.clientX, event.clientY),
        moved: false,
      });
      return;
    }

    const at = cellsAt(event);
    setDrag({
      id: block.id,
      mode,
      from: { x: block.x, y: block.y, w: block.w, h: block.h },
      originX: at.x,
      originY: at.y,
      moved: false,
    });
  };

  const move = (event: ReactPointerEvent) => {
    if (!drag) return;

    if (drag.mode === 'turn') {
      const block = layout.find((entry) => entry.id === drag.id);
      if (!block) return;
      const centre = centreOf(block);
      const swung = bearing(centre.x, centre.y, event.clientX, event.clientY) - drag.originAngle;
      if (!drag.moved && Math.abs(swung) < 2) return;
      if (!drag.moved) setDrag({ ...drag, moved: true });
      /* Five degrees at a time, so a turn that was meant to be straight comes
         out straight. Shift is the way to a number in between. */
      const step = event.shiftKey ? 1 : ROTATE_STEP;
      put(drag.id, { rotate: normalizeRotation(Math.round((drag.from + swung) / step) * step) });
      return;
    }

    const at = cellsAt(event);
    const dx = at.x - drag.originX;
    const dy = at.y - drag.originY;
    if (!drag.moved && Math.abs(dx) < 0.35 && Math.abs(dy) < 0.35) return;
    if (!drag.moved) setDrag({ ...drag, moved: true });
    if (drag.mode === 'move') {
      put(drag.id, { x: drag.from.x + dx, y: drag.from.y + dy });
    } else {
      put(drag.id, { w: drag.from.w + dx, h: drag.from.h + dy });
    }
  };

  const end = (event: ReactPointerEvent) => {
    if (!drag) return;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* the pointer was already gone; the drag ends either way */
    }
    setDrag(null);
  };

  /* Whatever else happens to the pointer — a capture taken away by the
     browser, a window that lost focus mid-drag — the drag is over. Without
     this a lost pointer leaves a block stuck to the cursor and the turn
     read-out stuck on screen, with no gesture left that ends it. */
  const lost = () => setDrag(null);

  const nudge = (event: ReactKeyboardEvent, block: Block) => {
    const by: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = by[event.key];
    if (delta) {
      event.preventDefault();
      /* Alt turns, shift resizes, neither moves. Up and down turn too, so the
         key that is nearest to hand does something rather than nothing. */
      if (event.altKey) {
        const way = delta[0] !== 0 ? delta[0] : delta[1];
        put(block.id, { rotate: normalizeRotation((block.rotate ?? 0) + way * ROTATE_STEP) });
      } else if (event.shiftKey) {
        put(block.id, { w: block.w + delta[0], h: block.h + delta[1] });
      } else {
        put(block.id, { x: block.x + delta[0], y: block.y + delta[1] });
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(block.id);
    }
  };

  const turning = drag?.mode === 'turn' && drag.moved ? drag.id : null;

  return (
    /* The surface swallows a tap on empty board so clicking away deselects,
       which is the only way off a block on a touchscreen. It is not itself a
       control — every draggable thing inside it is a real button. */
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={surface}
      className={`board-design${drag ? ' dragging' : ''}`}
      style={{ '--grid-cols': grid.cols, '--grid-rows': grid.rows } as CSSProperties}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      <span className="board-design-grid" aria-hidden="true" />

      {layout.map((block) => (
        /* The wrapper carries the rectangle and the turn, so everything
           attached to the block — the grip, the corner, the bin — swings with
           it and stays where the shop last saw it. It passes pointer events
           through; only its children take them, which is what leaves a tap on
           bare board meaning "deselect". */
        <div
          key={block.id}
          className="board-handle-wrap"
          style={
            {
              ...rectOf(block, grid),
              ...(block.rotate ? { transform: `rotate(${block.rotate}deg)` } : {}),
            } as CSSProperties
          }
        >
          <button
            type="button"
            className={`board-handle${selected === block.id ? ' on' : ''}`}
            aria-label={t.moveBlock(nameOf(block))}
            aria-pressed={selected === block.id}
            onPointerDown={(event) => start(event, block, 'move')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={lost}
            onKeyDown={(event) => nudge(event, block)}
            onClick={() => onSelect(block.id)}
          >
            <span className="board-handle-tag">{nameOf(block)}</span>
          </button>

          {selected === block.id && (
            <>
              {/* Nested alongside the handle rather than inside it so the bin
                  can be a real button: a button inside a button is neither.
                  Resizing and turning from the keyboard are shift+arrows and
                  alt+arrows on the block itself, so these two grips do not
                  need to be reachable separately. */}
              <span
                className="board-handle-size"
                role="presentation"
                onPointerDown={(event) => start(event, block, 'resize')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                onLostPointerCapture={lost}
              />
              <span
                className="board-handle-turn"
                role="presentation"
                title={t.turnBlock}
                onPointerDown={(event) => start(event, block, 'turn')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                onLostPointerCapture={lost}
              >
                <RotateCw size={13} />
              </span>
              <button
                type="button"
                className="board-handle-drop"
                aria-label={t.removeBlock}
                title={t.removeBlock}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(block.id);
                }}
              >
                <Trash2 size={13} />
              </button>
              {turning === block.id && (
                <span className="board-handle-angle" aria-hidden="true">
                  {t.degrees(block.rotate ?? 0)}
                </span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
