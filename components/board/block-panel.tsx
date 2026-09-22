'use client';

import { useState } from 'react';
import { Image as ImageIcon, Move, Plus, RotateCcw, Trash2, Wand2 } from 'lucide-react';
import {
  BLOCK_KINDS,
  clampBlock,
  findSpace,
  normalizeRotation,
  type Block,
  type BlockKind,
  type Grid,
  type Layout,
} from '@/lib/layout';
import { newId, type MenuSection } from '@/lib/board';
import { PicturePicker } from '@/components/board/picture-picker';
import { useCopy } from '@/lib/lang';
import { SHOP } from '@/lib/copy/shop';

/* What you can do to the thing you have hold of.
 *
 * Deliberately short. A block is a rectangle with a kind, and the rectangle
 * is set by dragging it, so everything left is the handful of choices that
 * cannot be dragged: which picture, what the words say, how big the type is,
 * and whether it stays. Anything that could be a direct manipulation on the
 * board is a direct manipulation on the board, not a control in here.
 *
 * The header is the escape hatch back to the automatic layout, and it says
 * what that costs, because it does cost something: dropping the layout throws
 * the arrangement away and the sections flow again.
 */

const DEFAULT_SIZE: Record<BlockKind, { w: number; h: number }> = {
  head: { w: 24, h: 3 },
  section: { w: 10, h: 6 },
  image: { w: 8, h: 6 },
  text: { w: 10, h: 2 },
  logo: { w: 4, h: 3 },
  reviews: { w: 14, h: 2 },
};

export function BlockPanel({
  layout,
  grid,
  sections,
  selected,
  onSelect,
  onChange,
  onDropLayout,
}: {
  layout: Layout;
  grid: Grid;
  sections: MenuSection[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (layout: Layout) => void;
  /** Back to the automatic layout, throwing this arrangement away. */
  onDropLayout: () => void;
}) {
  const t = useCopy(SHOP).design;
  const [picking, setPicking] = useState(false);
  const block = layout.find((entry) => entry.id === selected) ?? null;

  const put = (patch: Partial<Block>) => {
    if (!block) return;
    onChange(layout.map((entry) => (entry.id === block.id ? clampBlock({ ...entry, ...patch }, grid) : entry)));
  };

  const add = (kind: BlockKind) => {
    /* A section block has to name a section, and a section that is already on
       the board twice is a confusing board. The first unplaced one is almost
       always the one that was just typed. */
    const placed = new Set(layout.filter((entry) => entry.kind === 'section').map((entry) => entry.sectionId));
    const section = kind === 'section' ? sections.find((entry) => !placed.has(entry.id)) : undefined;
    if (kind === 'section' && !section) return;

    const size = DEFAULT_SIZE[kind];
    const w = Math.min(grid.cols, size.w);
    const h = Math.min(grid.rows, size.h);
    const at = findSpace(layout, grid, w, h);
    const fresh = clampBlock(
      {
        id: newId('b'),
        kind,
        x: at.x,
        y: at.y,
        w,
        h,
        ...(section ? { sectionId: section.id } : {}),
        ...(kind === 'text' ? { text: '', align: 'left' as const, tone: 'ink' as const } : {}),
      },
      grid,
    );
    onChange([...layout, fresh]);
    onSelect(fresh.id);
  };

  const unplaced = sections.filter(
    (section) => !layout.some((entry) => entry.kind === 'section' && entry.sectionId === section.id),
  );

  return (
    <section className="shop-panel design-panel">
      <div className="prefs-head">
        <h3>
          <Move size={15} /> {t.title}
        </h3>
        <button type="button" className="link-button" onClick={onDropLayout}>
          <Wand2 size={13} /> {t.backToAuto}
        </button>
      </div>

      <p className="prefs-hint">{t.hint}</p>

      <div className="design-add">
        {BLOCK_KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className="edit-add"
            disabled={kind.id === 'section' && unplaced.length === 0}
            onClick={() => add(kind.id)}
          >
            <Plus size={13} /> {t.kinds[kind.id]}
          </button>
        ))}
      </div>

      {!block && <p className="prefs-note">{t.pickOne}</p>}

      {block && (
        <div className="design-block">
          <div className="design-block-head">
            <b>{t.kinds[block.kind]}</b>
            <button
              type="button"
              className="edit-drop"
              aria-label={t.removeBlock}
              onClick={() => {
                onChange(layout.filter((entry) => entry.id !== block.id));
                onSelect(null);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {(block.kind === 'image' || block.kind === 'logo') && (
            <>
              <button type="button" className="button ghost" onClick={() => setPicking(true)}>
                <ImageIcon size={15} /> {block.src ? t.changePicture : t.choosePicture}
              </button>
              {picking && (
                <PicturePicker
                  value={block.src ?? null}
                  onPick={(src) => put({ src: src ?? undefined })}
                  onClose={() => setPicking(false)}
                />
              )}
              <div className="design-toggles">
                <Toggle
                  label={t.fill}
                  on={(block.fit ?? 'cover') === 'cover'}
                  onClick={() => put({ fit: 'cover' })}
                />
                <Toggle
                  label={t.whole}
                  on={block.fit === 'contain'}
                  onClick={() => put({ fit: 'contain' })}
                />
              </div>
              <label className="design-slider">
                {t.corners}
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={0.5}
                  value={block.round ?? 0}
                  onChange={(event) => put({ round: Number(event.target.value) })}
                />
              </label>
            </>
          )}

          {block.kind === 'text' && (
            <>
              <label className="shop-field">
                {t.words}
                <input
                  value={block.text ?? ''}
                  placeholder={t.wordsPlaceholder}
                  onChange={(event) => put({ text: event.target.value })}
                />
              </label>
              <div className="design-toggles">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <Toggle
                    key={align}
                    label={t.aligns[align]}
                    on={(block.align ?? 'left') === align}
                    onClick={() => put({ align })}
                  />
                ))}
              </div>
              <div className="design-toggles">
                {(['ink', 'dim', 'accent'] as const).map((tone) => (
                  <Toggle
                    key={tone}
                    label={t.tones[tone]}
                    on={(block.tone ?? 'ink') === tone}
                    onClick={() => put({ tone })}
                  />
                ))}
              </div>
            </>
          )}

          {/* The same turn the grip on the board makes, for a shop that
              wants a number rather than a swing — and the way back to square,
              which is hard to hit by hand and is what somebody who has gone
              too far actually wants. */}
          <div className="design-turn">
            <label className="design-slider">
              {t.turn}
              <input
                type="range"
                min={-45}
                max={45}
                step={1}
                value={block.rotate ?? 0}
                onChange={(event) => put({ rotate: normalizeRotation(Number(event.target.value)) })}
              />
            </label>
            <div className="design-turn-row">
              <b>{t.degrees(block.rotate ?? 0)}</b>
              <button
                type="button"
                className="link-button"
                disabled={!block.rotate}
                onClick={() => put({ rotate: 0 })}
              >
                <RotateCcw size={13} /> {t.straighten}
              </button>
            </div>
          </div>

          {block.kind !== 'image' && block.kind !== 'logo' && (
            <label className="design-slider">
              {t.typeSize}
              <input
                type="range"
                min={0.6}
                max={2}
                step={0.05}
                value={block.scale ?? 1}
                onChange={(event) => put({ scale: Number(event.target.value) })}
              />
            </label>
          )}

          <p className="prefs-note">{t.nudge}</p>
        </div>
      )}
    </section>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`design-toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  );
}
