'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { Camera, Loader2, Pipette, RotateCcw } from 'lucide-react';
import { paletteChoice, paletteOf, THEME_COLORS, THEMES, type Board, type ThemeId } from '@/lib/board';
import { legibility, paletteFromImage, readAsDataUrl, type PaletteChoice } from '@/lib/palette';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';
import { SHOP } from '@/lib/copy/shop';

/* The board's colours.
 *
 * Three that matter and two that usually should not. The ground, the text,
 * and the one colour that carries section headings and prices: that is the
 * whole vocabulary of a menu board, and a shop that can set those three can
 * match anything painted on their own wall. Muted text and hairline rules are
 * worked out from the first three and only shown when asked for, because a
 * shop that sets those two badly has made their board unreadable and will not
 * know why.
 *
 * The four themes are still here, now as starting points rather than as the
 * whole answer: tapping one loads its three colours and clears any override.
 *
 * The contrast figure under the swatches is not decoration. A board is read
 * from the back of a queue, and the one failure mode of letting people choose
 * their own colours is a board nobody can read from where they are standing.
 */

export function ColorPanel({
  board,
  onChange,
}: {
  board: Board;
  onChange: (patch: Partial<Board>) => void;
}) {
  const t = useCopy(SHOP).colour;
  const shared = useCopy(SHARED);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swatches, setSwatches] = useState<string[]>([]);
  const camera = useRef<HTMLInputElement | null>(null);

  const choice = paletteChoice(board);
  const palette = paletteOf(board);

  const set = (patch: Partial<PaletteChoice>) =>
    onChange({ palette: { ...board.palette, ...patch } });

  /* Picking a theme is picking three colours, not switching a class: the
     board keeps whatever the shop has typed everywhere else, and there is
     nothing left over from the last theme hiding in an override. */
  const applyTheme = (id: ThemeId) => onChange({ theme: id, palette: null });

  const fromPhoto = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const url = await readAsDataUrl(picked);
      const found = await paletteFromImage(url);
      setSwatches(found.swatches);
      set(found.choice);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : t.photoFailed);
    } finally {
      setBusy(false);
    }
  };

  const reads = legibility(palette);

  return (
    <section className="shop-panel">
      <div className="prefs-head">
        <h3>{t.title}</h3>
        <span className="prefs-hint">{t.hint}</span>
      </div>

      <div className="theme-row">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-chip${board.theme === theme.id && !board.palette ? ' on' : ''}`}
            style={
              {
                '--chip-bg': THEME_COLORS[theme.id].bg,
                '--chip-ink': THEME_COLORS[theme.id].ink,
                '--chip-accent': THEME_COLORS[theme.id].accent,
              } as CSSProperties
            }
            aria-pressed={board.theme === theme.id && !board.palette}
            onClick={() => applyTheme(theme.id)}
          >
            <span className="theme-swatch" aria-hidden="true" />
            <b>{shared.themes[theme.id].label}</b>
            <i>{shared.themes[theme.id].note}</i>
          </button>
        ))}
      </div>

      {/* The shop's own colours, straight off a photograph of the sign over
          the door. Read in this browser and never uploaded, which is both
          faster than a round trip and a smaller promise to keep. */}
      <div className="colour-photo">
        <button type="button" className="button ghost" disabled={busy} onClick={() => camera.current?.click()}>
          {busy ? <Loader2 size={15} className="spin" /> : <Camera size={15} />} {t.fromPhoto}
        </button>
        <span>{t.fromPhotoNote}</span>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void fromPhoto(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      {error && <p className="picture-picker-error">{error}</p>}

      {swatches.length > 0 && (
        <div className="colour-found">
          <span className="prefs-hint">{t.alsoInPhoto}</span>
          <div className="colour-swatches">
            {swatches.map((hex) => (
              <button
                key={hex}
                type="button"
                className="colour-swatch"
                style={{ background: hex }}
                aria-label={t.asAccent(hex)}
                title={hex}
                onClick={() => set({ accent: hex })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="colour-row">
        <Swatch label={t.ground} value={choice.bg} onChange={(bg) => set({ bg })} />
        <Swatch label={t.text} value={choice.ink} onChange={(ink) => set({ ink })} />
        <Swatch label={t.accent} value={choice.accent} onChange={(accent) => set({ accent })} />
      </div>

      {/* One number, in plain words. 4.5:1 is the usual floor for body text
          and a menu board is read further away than a web page, so anything
          under it is called out rather than quietly allowed. */}
      <p className={`colour-check${reads.ok ? '' : ' warn'}`}>
        {reads.ok ? t.readsWell(reads.ratio.toFixed(1)) : t.hardToRead(reads.ratio.toFixed(1))}
      </p>

      <div className="colour-more">
        <button type="button" className="link-button" onClick={() => setAdvanced(!advanced)}>
          {advanced ? t.fewer : t.more}
        </button>
        {board.palette && (
          <button type="button" className="link-button" onClick={() => onChange({ palette: null })}>
            <RotateCcw size={13} /> {t.backToTheme(shared.themes[board.theme].label)}
          </button>
        )}
      </div>

      {advanced && (
        <div className="colour-row">
          <Swatch
            label={t.muted}
            value={choice.dim ?? palette.dim}
            auto={choice.dim === null}
            onChange={(dim) => set({ dim })}
            onAuto={() => set({ dim: null })}
          />
          <Swatch
            label={t.lines}
            value={choice.rule ?? palette.rule}
            auto={choice.rule === null}
            onChange={(rule) => set({ rule })}
            onAuto={() => set({ rule: null })}
          />
        </div>
      )}
    </section>
  );
}

/* A native colour input. It looks different on every platform and that is the
   point: on a phone it is the system picker, with the eyedropper and the
   recent colours the person already knows, which is a better control than
   anything that could be built here. The hex beside it is for the shop owner
   whose designer sent them a hex. */
function Swatch({
  label,
  value,
  auto,
  onChange,
  onAuto,
}: {
  label: string;
  value: string;
  auto?: boolean;
  onChange: (hex: string) => void;
  onAuto?: () => void;
}) {
  const t = useCopy(SHOP).colour;
  /* The field holds what is being typed, which is not always a colour: "#f"
     is on the way to one. React's own pattern for a prop that has to reset
     local state is to compare it during render rather than in an effect, so
     a colour set from a photograph or a theme lands here without a second
     pass. */
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }

  return (
    <label className={`colour-field${auto ? ' is-auto' : ''}`}>
      <span className="colour-field-label">
        {label}
        {auto && <i>{t.auto}</i>}
      </span>
      <span className="colour-field-input">
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          className="colour-hex"
          value={draft}
          spellCheck={false}
          maxLength={7}
          aria-label={t.hexFor(label)}
          onChange={(event) => {
            /* Kept as typed while it is being typed: a controlled field that
               only accepts a complete hex cannot be typed into at all,
               because "#f" is not one. The board moves on the sixth digit. */
            const next = event.target.value;
            setDraft(next);
            if (/^#[0-9a-f]{6}$/i.test(next.trim())) onChange(next.trim().toLowerCase());
          }}
          onBlur={() => setDraft(value)}
        />
        {auto === false && onAuto && (
          <button type="button" className="icon-button" aria-label={t.backToAuto(label)} onClick={onAuto}>
            <Pipette size={14} />
          </button>
        )}
      </span>
    </label>
  );
}
