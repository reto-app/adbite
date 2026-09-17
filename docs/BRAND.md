# AdBite brand

Everything here is pulled from the live site, not from a mood board. If you
change something in `app/globals.css`, change it here too.

**What AdBite is, in one line:** local ad space on the screens independent
shops already run. Two audiences who never see each other's numbers — shops
see what they earn, advertisers see what they pay.

---

## Colour

Six colours do all the work. Everything else in `:root` is a shade of one of
them.

| Token | Hex | What it is |
| --- | --- | --- |
| `--board` | `#0e0e0e` | The black of the logo plate. Headers, primary buttons, dark bands. |
| `--chalk` | `#ffffff` | On black. |
| `--paper` | `#faf9f6` | Page background. Warm off-white, never pure white. |
| `--paper-sky` | `#e7f0f8` | The pale blue band. Alternates with paper to break up a long page. |
| `--sky` | `#92c4e8` | The accent, on dark. |
| `--sky-deep` | `#17557f` | The accent, on paper. Also the focus ring. |

Supporting:

| Token | Hex | What it is |
| --- | --- | --- |
| `--board-soft` | `#1b1d1c` | A panel sitting on black. |
| `--board-line` | `#363a38` | A rule on black. |
| `--paper-warm` | `#edeae2` | A panel sitting on paper. |
| `--ink` | `#111312` | Body text on paper. |
| `--ash` | `#5c625f` | Secondary text on paper. |
| `--ash-light` | `#9aa5a0` | Disabled, or a zero. |
| `--ash-dark` | `#b9c2be` | Secondary text **on black**. |
| `--ink-sky` | `#1d3243` | Text on the pale blue band. |
| `--rule` | `#e3e1da` | A rule on paper. |
| `--sky-mid` | `#7ab3de` | Hover on the accent. |

### The one rule worth learning

**Money is blue. Nothing else is.**

Every figure a shop earns or an advertiser spends carries `.money`, which is
`--money` (`#17557f`) on paper and `--money-on-dark` (`#92c4e8`) on black,
plus `font-variant-numeric: tabular-nums` so columns of figures line up.

```css
.money { color: var(--money); font-variant-numeric: tabular-nums; }
/* on a dark surface */
.numbers-band .money { color: var(--money-on-dark); }
```

Don't tint anything else with it. The palette used to reserve yellow for money
and then spend it on one decorative lamp instead; the rule now matches the
practice, and it only works because it is the only place blue appears as
emphasis.

### Illustration-only colours

`--price` (`#ffc72c`, a warm lamp) and `--stem` (`#0f6248`) exist inside the
drawn scenes and **never** touch interface. If you find yourself reaching for
the yellow for a button, don't.

### Advertiser colours

Warm colour belongs to the advertiser, never to AdBite. The drawn ad panels
use a spread so no two neighbours share one — coral `#de5540`, green
`#2f6f63`, plum `#7a4b8f`, navy `#17557f`, rose `#bf2f62`, ochre `#a9660f`,
brick `#b8341f`, olive `#4f7d3a`. Eight ads all in the same coral read as one
national brand buying every board, which is the opposite of the pitch.

---

## Type

Two families, both from Google Fonts.

| Role | Family | Where |
| --- | --- | --- |
| Display | **Outfit** — 500/600/700/800 | `h1`–`h3`, buttons, figures, anything set tight |
| Body | **Geist** | Everything else |

```ts
import { Geist, Outfit } from 'next/font/google';
const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const outfit = Outfit({ variable: '--font-display', subsets: ['latin'],
  weight: ['500', '600', '700', '800'] });
```

Headings are **800, negative tracking, tight leading**. That combination is
most of the brand's voice in type.

```css
h1 { font-size: clamp(38px, min(4.9vw, 8.2vh), 68px);
     font-weight: 800; letter-spacing: -0.045em; line-height: 0.94; }
h2 { font-size: clamp(27px, min(3.8vw, 6.1vh), 50px);
     letter-spacing: -0.035em; line-height: 0.98; }
h3 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
body { font-size: 16px; line-height: 1.55; }
```

Headings size against the **height** of the window as well as the width. A
4.9vw headline is 68px on any 1400px display whether it's 900px tall or 700px,
and at 700px it eats a tenth of the screen before the page has said anything.

### The reversed slab

The one signature typographic move: emphasise a phrase in a headline by
putting it in the logo's own black block, not by tinting it.

```html
<h1>Your TV already runs your menu.<br><em>Let it pay you, too.</em></h1>
```

`h1 em` gets `background: var(--board); color: var(--chalk)`, and usually a
`<Bite/>` in its top-right corner. Use it once per page.

---

## The mark

A black square with a **bite taken out of the top-right corner**, white
geometric type inside.

The bite is a real shape with two straight edges where the logo frame cut it.
It only reads correctly **anchored into a corner** with those two edges running
off the block, filled with whatever colour sits *behind* the block — so the
block looks bitten rather than decorated.

```
✅  bite in the top-right of a black block, filled page-background
✅  bite in any corner of a coloured band (see SkyShapes)
❌  bite floating in the middle of something
❌  bite filled with a colour that isn't the backdrop
❌  outlined, gradient, drop-shadowed, or rotated off its corner
```

### Assets

All live under `public/brand/`, and served from `https://adbite.site/brand/`.

| File | Format | Use |
| --- | --- | --- |
| `adbite-wordmark.svg` | SVG, `0 0 1122 284` | The wordmark alone. `fill: currentColor` — set the colour on the parent. |
| `adbite-icon.svg` | SVG, `0 0 1254 1254` | The square mark. App icons, avatars, favicons. |
| `adbite-bite.svg` | SVG, `0 0 363 313` | The bite alone, for corners. |
| `adbite-icon-512.png` | PNG 512² | Where SVG won't go. |
| `adbite-og.png` | PNG 1200×630 | Open Graph / link previews. |
| `email-header.png` | PNG 1200×300 | The plate at the top of every email. |
| `/favicon.svg`, `/apple-touch-icon.png` | | Site root. |

In React, `components/brand.tsx` exports `<Wordmark/>` and `<Bite/>`, both
`currentColor` and both `aria-hidden` — they always sit inside something that
already carries the name.

### Clear space and minimum size

Clear space is the height of the bite on all four sides. Minimum wordmark
width 72px; below that use the square icon.

---

## Shape and surface

| Thing | Value |
| --- | --- |
| Buttons, chips, pills | `border-radius: 999px` |
| Cards and panels | `14px` (or `16px` for the large ones) |
| Small controls, inputs | `7–11px` |
| Selected / emphasised card | `2px solid var(--board)` |
| Ordinary card | `1px solid var(--rule)` |
| Page width | `--shell: 1180px`, `--gutter: 24px` |
| Section padding | `--band: clamp(44px, 7vh, 104px)` |

Buttons: `.primary` is black on paper, `.invert` is white on black, `.ghost`
inherits `currentColor` so it survives being moved onto a dark section. All of
them lift 2px on hover — that's the only hover animation in the product.

Focus is never removed: `3px solid var(--sky-deep)`, `3px` offset.

Shadows are rare and soft when they appear:
`0 14px 34px rgba(12, 16, 14, 0.24)`.

---

## Imagery

**Flat, thick-lined, geometric illustration.** Drawn as inline SVG, not
shipped as image files — it stays sharp at any size, costs no download, and
animates. See `components/venue-scenes.tsx`, `shop-scene.tsx`, `gym-spot.tsx`,
`food-scene.tsx` for the house style: no gradients except broad light washes,
2px strokes, a warm lamp glow, real objects on the counter rather than
abstraction.

**Screens are photographed, not drawn.** Board videos live in `public/boards/`
(`rosas`, `roost`, `forno`, `meridian`, `spot`) at 960×540, h264, under 1.5MB,
built to loop seamlessly. They're rendered from Remotion projects, not shot.

**Motion pauses when it's off screen.** `components/idle-motion.tsx` marks
sections with `.off-screen` and the CSS stops their animations. Anything you
add with an infinite animation should sit inside a watched section.

### The honesty rules

These are not style preferences. Break them and the brand is lying.

1. **No real brand names as customers.** Every advertiser in the artwork is
   fictional and local — Iron Rose Gym, Freedom Cycles, Ninth Street Books,
   Rosewood Barbers, Mia's Flower Bar. They are examples, and the site says
   so.
2. **Label anything modelled.** Reach, cost-per-thousand and heads-past-the-board
   are arithmetic, not measurement, and every surface that shows one says
   which it is. We report plays and minutes because we count them.
3. **Sample data wears a badge.** The worked examples in the dashboard carry a
   Sample tag everywhere they appear and clear in one click.
4. **Don't quote a price the product can't back.** Video is $20 an hour shown,
   publicly. A permanent spot is priced per board in a conversation — that
   number is deliberately not on the public site, and not in a screenshot of
   the builder either.

---

## Voice

Plain, specific, and slightly understated. Short sentences. Concrete nouns —
"a strip under the menu", not "premium placement". Say the number or don't
make the claim. Name the awkward thing before someone else does ("Nothing is
charged now", "a pilot this small").

Headlines are a statement, not a slogan, and often two clauses with the second
in the black slab:

> Your TV already runs your menu. **Let it pay you, too.**
> Show up where your neighbors **already look.**
> Two ways an ad can show up.

Never: "unlock", "leverage", "supercharge", "revolutionise", exclamation
marks, or a sentence that would embarrass you read aloud to a shop owner.

Spanish is a first-class translation, not an afterthought — every string in
`lib/copy/` exists in both.

---

## Copy-paste starter

```css
:root {
  --board: #0e0e0e;
  --board-soft: #1b1d1c;
  --board-line: #363a38;
  --chalk: #ffffff;

  --paper: #faf9f6;
  --paper-sky: #e7f0f8;
  --paper-warm: #edeae2;

  --sky: #92c4e8;
  --sky-mid: #7ab3de;
  --sky-deep: #17557f;

  --money: #17557f;
  --money-on-dark: #92c4e8;

  --ink: #111312;
  --ash: #5c625f;
  --ash-light: #9aa5a0;
  --ash-dark: #b9c2be;
  --ink-sky: #1d3243;
  --rule: #e3e1da;

  --shell: 1180px;
  --gutter: 24px;
  --band: clamp(44px, 7vh, 104px);
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 0.98;
}

.money { color: var(--money); font-variant-numeric: tabular-nums; }

.button {
  display: inline-flex; align-items: center; gap: 9px;
  border-radius: 999px; padding: 14px 24px;
  font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 15px;
  background: var(--board); color: var(--chalk);
  transition: transform .18s ease;
}
.button:hover { transform: translateY(-2px); }

:focus-visible { outline: 3px solid var(--sky-deep); outline-offset: 3px; }
```

---

*Source of truth: `app/globals.css`, `components/brand.tsx`, `public/brand/`.
Last checked against the live site September 2026.*
