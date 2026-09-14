'use client';

import { useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  BADGES,
  emptyItem,
  emptySection,
  type Board,
  type MenuSection,
  type SlotId,
} from '@/lib/board';

/* The menu, as a list you can rearrange.
 *
 * Reordering is native HTML drag-and-drop with a keyboard path beside it: the
 * grip is a real button, and arrow keys move the row it belongs to. Drag alone
 * would put the one genuinely spatial task in this product out of reach of
 * anyone not using a mouse. */

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [held] = next.splice(from, 1);
  next.splice(to, 0, held);
  return next;
}

export function MenuEditor({
  board,
  slot,
  onChange,
}: {
  board: Board;
  slot: SlotId;
  onChange: (sections: MenuSection[]) => void;
}) {
  const sections = board.slots[slot] ?? [];
  /* [sectionIndex, itemIndex] of the row being dragged. */
  const [held, setHeld] = useState<[number, number] | null>(null);

  const setSection = (index: number, patch: Partial<MenuSection>) =>
    onChange(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)));

  const setItem = (si: number, ii: number, patch: Partial<MenuSection['items'][number]>) =>
    setSection(si, {
      items: sections[si].items.map((entry, i) => (i === ii ? { ...entry, ...patch } : entry)),
    });

  const moveItem = (si: number, from: number, to: number) =>
    setSection(si, { items: move(sections[si].items, from, to) });

  return (
    <div className="menu-editor">
      {sections.map((section, si) => (
        <section key={section.id} className="edit-section">
          <div className="edit-section-head">
            <input
              value={section.title}
              aria-label="Section name"
              placeholder="Section name"
              onChange={(event) => setSection(si, { title: event.target.value })}
            />
            <div className="edit-section-tools">
              <button
                type="button"
                aria-label="Move section up"
                disabled={si === 0}
                onClick={() => onChange(move(sections, si, si - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move section down"
                disabled={si === sections.length - 1}
                onClick={() => onChange(move(sections, si, si + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="edit-drop"
                aria-label={`Delete the ${section.title || 'untitled'} section`}
                onClick={() => onChange(sections.filter((_, i) => i !== si))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <ul className="edit-items">
            {section.items.map((entry, ii) => (
              /* The row is the drop target because you drop a menu item onto a
                 position, not onto a control. Keyboard users reorder with the
                 arrow keys on the grip below, so the behaviour this rule exists
                 to protect is already reachable without a mouse. */
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
              <li
                key={entry.id}
                className={held && held[0] === si && held[1] === ii ? 'held' : undefined}
                onDragOver={(event) => {
                  if (!held || held[0] !== si) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!held || held[0] !== si) return;
                  event.preventDefault();
                  moveItem(si, held[1], ii);
                  setHeld(null);
                }}
              >
                <button
                  type="button"
                  className="edit-grip"
                  aria-label={`Reorder ${entry.name || 'this item'}. Use the arrow keys.`}
                  draggable
                  onDragStart={() => setHeld([si, ii])}
                  onDragEnd={() => setHeld(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      moveItem(si, ii, ii - 1);
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      moveItem(si, ii, ii + 1);
                    }
                  }}
                >
                  <GripVertical size={14} />
                </button>

                <input
                  className="edit-name"
                  value={entry.name}
                  placeholder="Item"
                  aria-label="Item name"
                  onChange={(event) => setItem(si, ii, { name: event.target.value })}
                />
                <input
                  className="edit-note"
                  value={entry.note}
                  placeholder="Short description"
                  aria-label="Item description"
                  onChange={(event) => setItem(si, ii, { note: event.target.value })}
                />
                <input
                  className="edit-price"
                  value={entry.price}
                  placeholder="0"
                  inputMode="decimal"
                  aria-label="Price"
                  onChange={(event) => setItem(si, ii, { price: event.target.value })}
                />
                <select
                  className="edit-badge"
                  value={entry.badge}
                  aria-label="Tag"
                  onChange={(event) =>
                    setItem(si, ii, { badge: event.target.value as (typeof BADGES)[number]['id'] })
                  }
                >
                  {BADGES.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="edit-drop"
                  aria-label={`Remove ${entry.name || 'this item'}`}
                  onClick={() =>
                    setSection(si, { items: section.items.filter((_, i) => i !== ii) })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="edit-add"
            onClick={() => setSection(si, { items: [...section.items, emptyItem()] })}
          >
            <Plus size={14} /> Add an item
          </button>
        </section>
      ))}

      <button
        type="button"
        className="edit-add section"
        onClick={() => onChange([...sections, emptySection()])}
      >
        <Plus size={15} /> Add a section
      </button>
    </div>
  );
}
