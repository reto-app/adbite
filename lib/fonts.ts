/* The lettering a board is set in.
 *
 * A short list, not a font menu. Eleven faces that all survive being read
 * from eight feet away, paired so that picking badly is hard: each one names
 * the weights the board actually uses, and nothing here has a hairline.
 *
 * The files come from Google Fonts and are fetched only once a board asks
 * for them, so a shop on the stock face loads nothing extra. `use()` is
 * idempotent and safe to call on every render.
 */

export type FontId =
  | 'sans'
  | 'inter'
  | 'archivo'
  | 'bebas'
  | 'oswald'
  | 'space'
  | 'work'
  | 'playfair'
  | 'dmserif'
  | 'lora'
  | 'baskerville'
  | 'caveat';

export type Face = {
  id: FontId;
  label: string;
  /** How it reads, in three or four words. */
  note: string;
  /** Serif, sans or hand — what the picker groups by. */
  group: 'sans' | 'serif' | 'hand';
  /** The full CSS stack, with fallbacks that will not reflow much. */
  stack: string;
  /** The `family=` value for Google Fonts, or null for the stock face. */
  google: string | null;
};

export const FONTS: Face[] = [
  {
    id: 'sans',
    label: 'The usual',
    note: "The site's own face. Loads instantly",
    group: 'sans',
    stack: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
    google: null,
  },
  {
    id: 'inter',
    label: 'Inter',
    note: 'Plain, tight, hard to misread',
    group: 'sans',
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    google: 'Inter:wght@400;600;800',
  },
  {
    id: 'archivo',
    label: 'Archivo',
    note: 'Broad and heavy. Carries a long way',
    group: 'sans',
    stack: "'Archivo', ui-sans-serif, system-ui, sans-serif",
    google: 'Archivo:wght@400;600;800',
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    note: 'All capitals, narrow. Headings only',
    group: 'sans',
    stack: "'Bebas Neue', Impact, ui-sans-serif, sans-serif",
    google: 'Bebas+Neue',
  },
  {
    id: 'oswald',
    label: 'Oswald',
    note: 'Condensed. Fits a long dish name',
    group: 'sans',
    stack: "'Oswald', ui-sans-serif, system-ui, sans-serif",
    google: 'Oswald:wght@400;600;700',
  },
  {
    id: 'space',
    label: 'Space Grotesk',
    note: 'Squared off, a little modern',
    group: 'sans',
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    google: 'Space+Grotesk:wght@400;600;700',
  },
  {
    id: 'work',
    label: 'Work Sans',
    note: 'Friendly and quiet',
    group: 'sans',
    stack: "'Work Sans', ui-sans-serif, system-ui, sans-serif",
    google: 'Work+Sans:wght@400;600;800',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    note: 'High contrast. Reads dressed up',
    group: 'serif',
    stack: "'Playfair Display', Georgia, serif",
    google: 'Playfair+Display:wght@400;600;800',
  },
  {
    id: 'dmserif',
    label: 'DM Serif Display',
    note: 'Solid serif, good big',
    group: 'serif',
    stack: "'DM Serif Display', Georgia, serif",
    google: 'DM+Serif+Display',
  },
  {
    id: 'lora',
    label: 'Lora',
    note: 'Warm serif. Good for the small lines',
    group: 'serif',
    stack: "'Lora', Georgia, serif",
    google: 'Lora:wght@400;600;700',
  },
  {
    id: 'baskerville',
    label: 'Libre Baskerville',
    note: 'Bookish and steady',
    group: 'serif',
    stack: "'Libre Baskerville', Georgia, serif",
    google: 'Libre+Baskerville:wght@400;700',
  },
  {
    id: 'caveat',
    label: 'Caveat',
    note: 'Handwritten. Like a chalk board',
    group: 'hand',
    stack: "'Caveat', 'Comic Sans MS', cursive",
    google: 'Caveat:wght@400;600;700',
  },
];

export function faceById(id: FontId | null | undefined): Face {
  return FONTS.find((face) => face.id === id) ?? FONTS[0];
}

export function isFontId(value: unknown): value is FontId {
  return typeof value === 'string' && FONTS.some((face) => face.id === value);
}

/* ---- loading them --------------------------------------------------------
   One <link> per family, added the first time anything asks for it and never
   removed: a shop flicking through the picker would otherwise re-download a
   face each time it came back round. `display=swap` so a slow font never
   leaves the preview blank.

   Named `load`, not `use`: anything called `useSomething` is read as a React
   hook by the linter and by the next person, and this is neither. */

const loaded = new Set<string>();

export function load(...ids: (FontId | null | undefined)[]) {
  if (typeof document === 'undefined') return;
  for (const id of ids) {
    const face = faceById(id);
    if (!face.google || loaded.has(face.google)) continue;
    loaded.add(face.google);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${face.google}&display=swap`;
    document.head.appendChild(link);
  }
}

/** The pair a board is set in. Display carries the name, the sections and the
    prices; body carries everything a customer reads standing still. */
export type FontPair = { display: FontId; body: FontId };

export const DEFAULT_FONTS: FontPair = { display: 'sans', body: 'sans' };

/** Ready-made pairings, for a shop that would rather not choose twice. */
export const FONT_PAIRS: { id: string; label: string; fonts: FontPair }[] = [
  { id: 'stock', label: 'The usual', fonts: { display: 'sans', body: 'sans' } },
  { id: 'counter', label: 'Counter', fonts: { display: 'bebas', body: 'work' } },
  { id: 'diner', label: 'Diner', fonts: { display: 'archivo', body: 'inter' } },
  { id: 'trattoria', label: 'Trattoria', fonts: { display: 'playfair', body: 'lora' } },
  { id: 'cafe', label: 'Café', fonts: { display: 'dmserif', body: 'work' } },
  { id: 'chalk', label: 'Chalk', fonts: { display: 'caveat', body: 'work' } },
  { id: 'market', label: 'Market', fonts: { display: 'oswald', body: 'inter' } },
  { id: 'studio', label: 'Studio', fonts: { display: 'space', body: 'space' } },
];
