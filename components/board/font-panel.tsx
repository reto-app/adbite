'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FONTS, FONTS, FONT_PAIRS, faceById, load as loadFonts, type FontId } from '@/lib/fonts';
import type { Board } from '@/lib/board';
import { useCopy } from '@/lib/lang';
import { SHOP } from '@/lib/copy/shop';

/* The lettering.
 *
 * Two questions, and the shop only has to answer the first: eight ready-made
 * pairings across the top, and behind a "choose them separately" link the two
 * lists on their own. Picking a pairing is one tap and cannot come out ugly;
 * picking separately is there because somebody's sign painter used Oswald and
 * they want the board to match.
 *
 * Every name in the list is drawn in its own face, which means the faces have
 * to be fetched before the list is worth reading — done here on open rather
 * than on the board's first render, so a shop that never opens this panel
 * never downloads a font it is not using.
 */

export function FontPanel({
  board,
  onChange,
}: {
  board: Board;
  onChange: (patch: Partial<Board>) => void;
}) {
  const t = useCopy(SHOP).lettering;
  const [separate, setSeparate] = useState(false);
  const fonts = board.fonts ?? DEFAULT_FONTS;

  /* The whole list, once, when the panel is on screen. Twelve faces is a few
     hundred kilobytes and it is the difference between a list of names and a
     list of specimens. */
  useEffect(() => {
    loadFonts(...FONTS.map((face) => face.id));
  }, []);

  const pairId = FONT_PAIRS.find(
    (pair) => pair.fonts.display === fonts.display && pair.fonts.body === fonts.body,
  )?.id;

  return (
    <section className="shop-panel">
      <div className="prefs-head">
        <h3>{t.title}</h3>
        <span className="prefs-hint">{t.hint}</span>
      </div>

      <div className="font-pairs">
        {FONT_PAIRS.map((pair) => (
          <button
            key={pair.id}
            type="button"
            className={`font-pair${pairId === pair.id ? ' on' : ''}`}
            aria-pressed={pairId === pair.id}
            onClick={() => onChange({ fonts: { ...pair.fonts } })}
          >
            <b style={{ fontFamily: faceById(pair.fonts.display).stack }}>{pair.label}</b>
            <i style={{ fontFamily: faceById(pair.fonts.body).stack }}>{t.sample}</i>
          </button>
        ))}
      </div>

      <button type="button" className="link-button" onClick={() => setSeparate(!separate)}>
        {separate ? t.together : t.apart}
      </button>

      {separate && (
        <div className="font-lists">
          <FontList
            label={t.headings}
            note={t.headingsNote}
            value={fonts.display}
            onPick={(display) => onChange({ fonts: { ...fonts, display } })}
          />
          <FontList
            label={t.body}
            note={t.bodyNote}
            value={fonts.body}
            onPick={(body) => onChange({ fonts: { ...fonts, body } })}
          />
        </div>
      )}
    </section>
  );
}

function FontList({
  label,
  note,
  value,
  onPick,
}: {
  label: string;
  note: string;
  value: FontId;
  onPick: (id: FontId) => void;
}) {
  return (
    <fieldset className="font-list">
      <legend>
        {label} <i>{note}</i>
      </legend>
      {FONTS.map((face) => (
        <button
          key={face.id}
          type="button"
          className={`font-option${value === face.id ? ' on' : ''}`}
          aria-pressed={value === face.id}
          onClick={() => onPick(face.id)}
        >
          <b style={{ fontFamily: face.stack }}>{face.label}</b>
          <i>{face.note}</i>
        </button>
      ))}
    </fieldset>
  );
}
