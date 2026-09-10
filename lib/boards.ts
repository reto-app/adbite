/* Ad formats and the slot each board gives them.
 *
 * Slot rects are percentages measured by hand against the poster frames in
 * `public/boards/*.jpg`. Re-render one of those Remotion boards and its
 * numbers have to be measured again, or the ad will sit off its slot. Both the
 * campaign builder and the advertiser-page flow map read them from here so
 * there is only one set to correct. */

export type FormatId = 'banner' | 'rail' | 'full' | 'video';

export type Slot = { left: number; top: number; width: number; height: number };

export const FORMATS: {
  id: FormatId;
  name: string;
  blurb: string;
  spec: string;
  /** Where the slot sits on the little diagram drawn on a format card. */
  diagram: { left: string; top: string; width: string; height: string };
  /** The board this format reads best on, for a single-preview context. */
  showcase: string;
}[] = [
  {
    id: 'banner',
    name: 'Bottom banner',
    blurb: 'A strip under the shop’s menu. Their board stays readable the whole time.',
    spec: '1920 × 240 · still image',
    diagram: { left: '4%', top: '76%', width: '92%', height: '18%' },
    showcase: 'rosas',
  },
  {
    id: 'rail',
    name: 'Side rail',
    blurb: 'The right third of a wide board, top to bottom, beside the menu.',
    spec: '720 × 1080 · still image',
    diagram: { left: '64%', top: '8%', width: '30%', height: '84%' },
    showcase: 'roost',
  },
  {
    id: 'full',
    name: 'Full screen',
    blurb: 'The whole screen for one turn of the rotation, then the menu returns.',
    spec: '1920 × 1080 · still image',
    diagram: { left: '4%', top: '8%', width: '92%', height: '84%' },
    showcase: 'rosas',
  },
  {
    id: 'video',
    name: 'Short video',
    blurb: 'Up to fifteen seconds of motion, muted, in the full-screen slot.',
    spec: '1920 × 1080 · up to 0:15',
    diagram: { left: '4%', top: '8%', width: '92%', height: '84%' },
    showcase: 'rosas',
  },
];

export type Board = {
  id: string;
  name: string;
  screen: string;
  portrait?: boolean;
  slots: Partial<Record<FormatId, Slot>>;
};

export const BOARDS: Board[] = [
  {
    id: 'rosas',
    name: 'Rosas Taqueria',
    screen: '55" wide board over the counter',
    slots: {
      banner: { left: 0.9, top: 84.3, width: 98.2, height: 14.5 },
      full: { left: 0.9, top: 1.5, width: 98.2, height: 97 },
      video: { left: 0.9, top: 1.5, width: 98.2, height: 97 },
    },
  },
  {
    id: 'roost',
    name: 'The Roost Shop',
    screen: '43" board, menu on the left',
    slots: {
      rail: { left: 69.3, top: 2.2, width: 29.7, height: 95.6 },
      full: { left: 5.7, top: 1.5, width: 93.7, height: 97 },
      video: { left: 5.7, top: 1.5, width: 93.7, height: 97 },
    },
  },
  {
    id: 'forno',
    name: 'Forno Nove',
    screen: 'Two portrait screens, ad on the right',
    slots: {
      rail: { left: 52.1, top: 7, width: 25.4, height: 86 },
      full: { left: 52.1, top: 7, width: 25.4, height: 86 },
      video: { left: 52.1, top: 7, width: 25.4, height: 86 },
    },
  },
  {
    id: 'meridian',
    name: 'Meridian Café',
    screen: '50" portrait board behind the counter',
    portrait: true,
    slots: {
      banner: { left: 1.5, top: 87.3, width: 97, height: 11.1 },
      full: { left: 1.5, top: 1.5, width: 97, height: 97 },
      video: { left: 1.5, top: 1.5, width: 97, height: 97 },
    },
  },
];

export function boardById(id: string): Board {
  return BOARDS.find((board) => board.id === id) ?? BOARDS[0];
}
