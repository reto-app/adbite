/* The colours a board is drawn in.
 *
 * A shop picks three: the ground, the text, and the one colour that carries
 * the section headings and the prices. Everything else a board needs — the
 * muted second line, the hairline rules, the tint behind an ad slot, the
 * text that sits *on* the accent — is worked out from those three, because
 * asking a shop owner for seven colours is how a board ends up unreadable.
 *
 * The two derived ones a shop is most likely to disagree with (dim and rule)
 * can be overridden, and are null until they are.
 *
 * Pure and DOM-free on purpose: lib/compose.ts sends the resolved palette to
 * the TV and cannot import anything that touches `window`. The one function
 * that does need a canvas — pulling a palette out of a photograph — is at the
 * bottom and checks for the DOM itself.
 */

export type Rgb = { r: number; g: number; b: number };

/* ---- hex in, hex out ----------------------------------------------------- */

export function toRgb(hex: string): Rgb {
  const clean = hex.trim().replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return { r: 0, g: 0, b: 0 };
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** A valid `#rrggbb` or `#rgb`, and nothing else. Typed input reaches this. */
export function isHex(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** `amount` of `top` laid over `bottom`. Both opaque, so the result is too. */
export function mix(top: string, bottom: string, amount: number): string {
  const a = toRgb(top);
  const b = toRgb(bottom);
  const t = Math.max(0, Math.min(1, amount));
  return toHex({
    r: a.r * t + b.r * (1 - t),
    g: a.g * t + b.g * (1 - t),
    b: a.b * t + b.b * (1 - t),
  });
}

/* ---- is it readable? -----------------------------------------------------
   The board is read from across a room, so contrast is not a nicety here.
   WCAG's relative luminance is the same maths a browser's own accessibility
   checker uses, and it is what decides whether the text on an accent chip
   comes out black or white. */

function channel(value: number) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 1 (identical) to 21 (black on white). 4.5 is the usual floor for body text. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever is easier to read on this colour. */
export function readableOn(hex: string): string {
  return contrast('#ffffff', hex) >= contrast('#111111', hex) ? '#ffffff' : '#111111';
}

/** How far apart two colours look, 0 to 1. Cheap, and unlike a contrast
    ratio it can tell red from green. */
export function distance(a: string, b: string): number {
  const x = toRgb(a);
  const y = toRgb(b);
  return (Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b)) / 765;
}

/** Saturation, 0 (grey) to 1, on the HSL definition. */
export function chroma(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** Walk a colour toward black or white until it reads on `against`. */
export function ensureContrast(hex: string, against: string, ratio: number): string {
  if (contrast(hex, against) >= ratio) return hex;
  const target = luminance(against) > 0.4 ? '#000000' : '#ffffff';
  let best = hex;
  for (let step = 1; step <= 20; step += 1) {
    best = mix(target, hex, step / 20);
    if (contrast(best, against) >= ratio) return best;
  }
  return target;
}

/* ---- a full palette from three colours ----------------------------------- */

/** What a shop actually chooses. `dim` and `rule` are null until overridden. */
export type PaletteChoice = {
  bg: string;
  ink: string;
  accent: string;
  dim: string | null;
  rule: string | null;
};

/** Every colour the board is drawn with, all opaque hex. */
export type Palette = {
  bg: string;
  ink: string;
  accent: string;
  dim: string;
  rule: string;
  /** The tint behind an empty ad slot. */
  ad: string;
  /** Text laid on top of the accent, on a badge or a price chip. */
  onAccent: string;
};

/* The alphas the four stock themes were written with, so a board that has
   never been recoloured resolves to exactly the pixels it had before. */
const DIM = 0.6;
const RULE = 0.18;
const AD = 0.08;

export function resolve(choice: PaletteChoice): Palette {
  const bg = isHex(choice.bg) ? choice.bg : '#14100d';
  const ink = isHex(choice.ink) ? choice.ink : readableOn(bg);
  /* The accent carries section headings and prices. Those are large type, so
     3:1 is the floor it is held to rather than body text's 4.5 — but it is
     held to something, because an eyedropper pointed at a photograph will
     otherwise happily return a colour one shade off the ground. */
  const accent = ensureContrast(isHex(choice.accent) ? choice.accent : ink, bg, 3);
  return {
    bg,
    ink,
    accent,
    dim: isHex(choice.dim) ? choice.dim : mix(ink, bg, DIM),
    rule: isHex(choice.rule) ? choice.rule : mix(ink, bg, RULE),
    ad: mix(ink, bg, AD),
    /* The ground, on a badge sitting in the accent — which is what the four
       stock themes did, and it is the right answer: a Popular tag in the
       board's own background colour reads as part of the board rather than as
       a sticker on it. Black or white only when the ground would disappear
       into the accent it is printed on. */
    onAccent: contrast(bg, accent) >= 4.5 ? bg : readableOn(accent),
  };
}

/* ---- is this board readable from the back of the queue? ------------------
   Two floors, not one. Body text is held to WCAG's 4.5:1; the accent carries
   section headings and prices, which are large type, and large type's floor
   is 3:1 — holding it to 4.5 would tell a shop that Warm, one of the four
   themes shipped with the product, was a mistake. */

export const INK_FLOOR = 4.5;
export const ACCENT_FLOOR = 3;

export function legibility(palette: Palette): { ok: boolean; ratio: number } {
  const ink = contrast(palette.ink, palette.bg);
  const accent = contrast(palette.accent, palette.bg);
  return {
    ok: ink >= INK_FLOOR && accent >= ACCENT_FLOOR,
    /* The number shown is the one a shop can act on: whichever of the two is
       furthest below its own floor, or the body text when both pass. */
    ratio: ink / INK_FLOOR <= accent / ACCENT_FLOOR ? ink : accent,
  };
}

/* ---- the four themes -----------------------------------------------------
   A theme names the three colours a board is built from; everything else is
   worked out above. These are the same pixels the four
   `.board-canvas.theme-*` classes drew before a shop could recolour anything,
   so a board nobody has touched does not move.

   They live here rather than in lib/board.ts because lib/compose.ts resolves
   the same palette on its way to a TV and cannot import anything with a
   browser in it. Adding a fifth theme is three colours here, a case in
   ThemeId, and nothing else anywhere. */

export type ThemeSeed = { bg: string; ink: string; accent: string };

export const THEME_COLORS: Record<'chalk' | 'enamel' | 'warm' | 'garden', ThemeSeed> = {
  chalk: { bg: '#14100d', ink: '#ffffff', accent: '#ffc72c' },
  enamel: { bg: '#f3ead6', ink: '#241d12', accent: '#8a6a2f' },
  warm: { bg: '#b4502f', ink: '#fdf3e7', accent: '#ffd9a0' },
  garden: { bg: '#12372a', ink: '#f4f1e4', accent: '#d9b45c' },
};

/** What a board actually reads as: theme underneath, the shop's own on top. */
export function paletteChoice(board: {
  theme: keyof typeof THEME_COLORS;
  palette?: Partial<PaletteChoice> | null;
}): PaletteChoice {
  const base = THEME_COLORS[board.theme] ?? THEME_COLORS.chalk;
  const custom = board.palette ?? null;
  return {
    bg: isHex(custom?.bg) ? custom.bg : base.bg,
    ink: isHex(custom?.ink) ? custom.ink : base.ink,
    accent: isHex(custom?.accent) ? custom.accent : base.accent,
    dim: isHex(custom?.dim) ? custom.dim : null,
    rule: isHex(custom?.rule) ? custom.rule : null,
  };
}

/** Every colour a board is drawn with. One call, everywhere it is drawn. */
export function paletteOf(board: {
  theme: keyof typeof THEME_COLORS;
  palette?: Partial<PaletteChoice> | null;
}): Palette {
  return resolve(paletteChoice(board));
}

/** The CSS custom properties the board component sets. */
export function cssVars(palette: Palette): Record<string, string> {
  return {
    '--bd-bg': palette.bg,
    '--bd-ink': palette.ink,
    '--bd-dim': palette.dim,
    '--bd-rule': palette.rule,
    '--bd-accent': palette.accent,
    '--bd-ad': palette.ad,
    '--bd-on-accent': palette.onAccent,
  };
}

/** `0xRRGGBBAA`, the only colour literal a Roku understands. */
export function toRokuColor(hex: string): string {
  return `0x${toHex(toRgb(hex)).slice(1).toUpperCase()}FF`;
}

/* ---- a palette out of a photograph ---------------------------------------
   Point a phone at the sign over the door, or at the logo on the cups, and
   the board comes out in the shop's own colours. This runs entirely in the
   browser: the picture is never uploaded, which is both faster than a round
   trip and a smaller promise to keep.
 *
   The method is a coarse histogram rather than k-means. A logo has a handful
   of flat colours in it and k-means on 20,000 pixels in JavaScript is both
   slower and less predictable; bucketing to 5 bits a channel and merging
   neighbours gets the same answer and always gets the same answer twice. */

export type Extracted = {
  /** Ordered by how much of the picture they cover. */
  swatches: string[];
  choice: { bg: string; ink: string; accent: string };
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be read.'));
    image.src = src;
  });
}

/** Down to 140px on the long edge: enough colour, little enough work. */
function pixelsOf(image: HTMLImageElement): Uint8ClampedArray | null {
  const scale = Math.min(1, 140 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  try {
    return context.getImageData(0, 0, width, height).data;
  } catch {
    /* A cross-origin image with no CORS headers taints the canvas. */
    return null;
  }
}

export async function paletteFromImage(src: string): Promise<Extracted> {
  const image = await loadImage(src);
  const data = pixelsOf(image);
  if (!data) throw new Error('That image could not be read.');

  const bins = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    /* A photograph of a menu board is mostly the photographer's shadow at
       the edges; anything close to transparent is not a colour choice. */
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bin = bins.get(key);
    if (bin) {
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bin.n += 1;
    } else {
      bins.set(key, { r, g, b, n: 1 });
    }
  }

  const ranked = [...bins.values()]
    .map((bin) => ({ hex: toHex({ r: bin.r / bin.n, g: bin.g / bin.n, b: bin.b / bin.n }), n: bin.n }))
    .sort((a, b) => b.n - a.n);
  if (ranked.length === 0) throw new Error('That image had no colour in it.');

  /* Keep the picture's own order but drop near-duplicates, so the swatch row
     is eight distinguishable colours rather than eight shades of one. */
  const swatches: { hex: string; n: number }[] = [];
  for (const entry of ranked) {
    if (swatches.some((kept) => distance(kept.hex, entry.hex) < 0.09)) continue;
    swatches.push(entry);
    if (swatches.length === 10) break;
  }

  const bg = swatches[0].hex;
  const total = swatches.reduce((sum, entry) => sum + entry.n, 0) || 1;

  /* The accent is the colour a person would call "the shop's colour": the
     most saturated thing in the picture that is also actually present in it
     and is not the ground it would have to be read against. */
  const accent =
    swatches
      .slice(1)
      .map((entry) => ({
        hex: entry.hex,
        score: chroma(entry.hex) * (0.35 + (entry.n / total) * 0.65) * (contrast(entry.hex, bg) >= 2 ? 1 : 0.2),
      }))
      .sort((a, b) => b.score - a.score)[0]?.hex ?? readableOn(bg);

  /* Text is not pulled from the photograph. A logo rarely contains a colour
     that can carry a paragraph, and the one thing a menu board must do is
     be legible from the back of the queue. */
  const ink = readableOn(bg);

  return {
    swatches: swatches.map((entry) => entry.hex),
    choice: { bg, ink, accent: ensureContrast(accent, bg, 3.5) },
  };
}

/** Read a picked file as a data URL, for the extractor and the preview. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('That file could not be read.'));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}
