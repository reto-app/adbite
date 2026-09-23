/* The Test Shop board, composed by the same function the server uses.
 *
 * The point is that this package is not a hand-written approximation of what
 * a shop gets. It is the real lib/compose.ts output for a real shop row — a
 * display screen that sold the strip along its foot — with the asset URLs
 * rewritten to the package-relative names build.sh understands. If compose()
 * stops producing a stage, this board stops having one, and the TV shows it.
 *
 *   node tools/make-test-board.mjs      # -> test-shop/board.json
 */

import { build } from 'esbuild';
import { mkdtemp, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

/* compose.ts is deliberately free of React and of the `@/` alias, so it
   bundles on its own — which is the same property that lets a Vercel
   function import it. */
const out = await mkdtemp(join(tmpdir(), 'adbite-compose-'));
await build({
  entryPoints: [join(root, 'lib', 'compose.ts')],
  outfile: join(out, 'compose.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'warning',
});
const { compose } = await import(join(out, 'compose.mjs'));

const ads = (await readdir(join(here, '..', 'test-shop', 'ads'))).filter((f) => f.endsWith('.png')).sort();

/* The pane this board's film is cut to, printed so the clip in test-shop/media
   can be checked against it. worker/index.mjs cuts a real shop's film to the
   same numbers; tools/cut-stage-clip.sh cuts this one. */
const { stageFrame } = await import(join(out, 'compose.mjs'));

const HEADLINES = [
  'Your ad, on this screen', 'Every face in the queue', 'Local shops, local ads',
  'Book a spot in a minute', 'A board that pays for itself', 'Reach the counter, not a feed',
  'Fifteen seconds, every rotation', 'The screen they already read',
  'Advertise where they queue', 'This space is for rent',
];

/* The `boards.board` column for a shop who answered "a display screen" and
   then "a strip along the bottom" — which, on the numbers, is most of them. */
const board = {
  shopName: 'Test Shop',
  tagline: 'Tacos · the auxiliary board',
  theme: 'chalk',
  orientation: 'portrait',
  turn: 'left',
  kind: 'display',
  source: 'media',
  adPlacement: 'banner',
  slots: { morning: [], midday: [], evening: [] },
  reviews: { on: false, items: [] },
  media: { on: false, name: null, src: null },
};

const composed = compose({
  shopId: 'test-shop',
  board,
  boardVersion: 1,
  updatedAt: new Date().toISOString(),
  screen: 'menu',
  pollMinutes: 15,
  /* One stitched loop of the shop's own footage. A real shop's library is
     several pieces; the stage rotates them either way. */
  media: [
    {
      id: 'tacos-loop',
      name: 'Tacos',
      kind: 'video',
      src: 'https://example.invalid/tacos-loop.mp4',
      sha256: 'x'.repeat(64),
      bytes: 1,
      seconds: 48,
    },
  ],
  spots: ads.map((file, i) => ({
    campaignId: `house-${String(i + 1).padStart(2, '0')}`,
    name: `AdBite — ${HEADLINES[i]}`,
    format: 'banner',
    src: `https://example.invalid/${file}`,
    sha256: 'x'.repeat(64),
    bytes: 1,
    seconds: 6,
  })),
});

/* Inside a package the device resolves a relative src against pkg:/, so the
   absolute URLs a real sync would carry become the names build.sh packages.
   sha256 and bytes go with them: ensureList() only verifies what it had to
   download, and nothing here is downloaded. */
const local = (item, dir) => {
  const { sha256, bytes, ...rest } = item;
  return { ...rest, src: `${dir}/${item.src.split('/').pop()}` };
};

const config = {
  ...composed,
  /* Once a day is what a shop wants; this board is here to be watched. */
  refreshMinutes: 15,
  spotSeconds: 6,
  stage: composed.stage.map((item) => local(item, 'media')),
  ads: composed.ads.map((item) => ({ ...local(item, 'ads'), seconds: 6 })),
};

await writeFile(join(here, '..', 'test-shop', 'board.json'), JSON.stringify(config, null, 2) + '\n');
console.log(`  supplemental: ${config.supplemental}`);
console.log(`  adLayout: ${config.adLayout} · adShare: ${config.board.adShare}`);
const frame = stageFrame(board);
const file = frame.turn === 'none' ? [frame.width, frame.height] : [frame.height, frame.width];
console.log(`  stage: ${config.stage.length} piece(s) · ads: ${config.ads.length} spot(s)`);
console.log(`  pane: ${frame.width}x${frame.height} canvas, turned ${frame.turn} -> ${file[0]}x${file[1]} file`);

await rm(out, { recursive: true, force: true });
