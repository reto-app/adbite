#!/usr/bin/env node
/* Put the board faces where a TV can fetch them.
 *
 *   node --env-file=.env.local scripts/board-fonts.mjs
 *
 * A Roku's Font node takes a `uri`, so a board set in Playfair can be drawn in
 * Playfair on the wall — but only from a real file, hashed and sized so the
 * channel can verify it the way it verifies every other byte it downloads.
 * This fetches the two weights of each face from Google Fonts, puts them in
 * the assets bucket under `fonts/`, and rewrites the table in
 * lib/board-fonts.ts.
 *
 * Safe to re-run. The object key is the file's own hash, so a face that has
 * not changed is uploaded to the same key and a face Google has re-cut lands
 * beside the old one rather than on top of it — no TV is ever served a file
 * whose bytes changed under its hash.
 *
 * Google Fonts are under the OFL or Apache 2.0; both allow redistribution.
 * The licence files come down with the faces and go in the bucket beside them.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/* The `family` value from lib/fonts.ts, and the two weights the board draws
   with. Where a face ships only one weight (Bebas Neue, DM Serif Display) the
   same file is used for both and the device fakes nothing — those faces are
   display faces and were chosen knowing that. */
const FACES = {
  inter: { family: 'Inter', regular: 400, bold: 800 },
  archivo: { family: 'Archivo', regular: 400, bold: 800 },
  bebas: { family: 'Bebas Neue', regular: 400, bold: 400 },
  oswald: { family: 'Oswald', regular: 400, bold: 700 },
  space: { family: 'Space Grotesk', regular: 400, bold: 700 },
  work: { family: 'Work Sans', regular: 400, bold: 800 },
  playfair: { family: 'Playfair Display', regular: 400, bold: 800 },
  dmserif: { family: 'DM Serif Display', regular: 400, bold: 400 },
  lora: { family: 'Lora', regular: 400, bold: 700 },
  baskerville: { family: 'Libre Baskerville', regular: 400, bold: 700 },
  caveat: { family: 'Caveat', regular: 400, bold: 700 },
};

const ORIGIN = process.env.ASSETS_ORIGIN ?? 'https://assets.adbite.site';

function bucket() {
  const account = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const name = process.env.R2_BUCKET;
  if (!account || !accessKeyId || !secretAccessKey || !name) {
    throw new Error('R2 is not configured. Set R2_* in .env.local.');
  }
  return {
    name,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

/* Google's CSS endpoint hands back a different format per user agent. Asking
   as an old browser is what gets TTF rather than WOFF2, and a Roku's Font
   node reads TTF and OTF only. */
const OLD_BROWSER = 'Mozilla/5.0 (Windows NT 5.1)';

async function ttfUrl(family, weight) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
    { headers: { 'user-agent': OLD_BROWSER } },
  );
  if (!css.ok) throw new Error(`${family} ${weight}: Google said ${css.status}`);
  const text = await css.text();
  const found = text.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  if (!found) throw new Error(`${family} ${weight}: no TTF in the stylesheet`);
  return found[1];
}

async function put(store, key, body, contentType) {
  await store.client.send(
    new PutObjectCommand({
      Bucket: store.name,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

async function upload(store, family, weight) {
  const url = await ttfUrl(family, weight);
  const response = await fetch(url, { headers: { 'user-agent': OLD_BROWSER } });
  if (!response.ok) throw new Error(`${family} ${weight}: download said ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const key = `fonts/${sha256}.ttf`;
  await put(store, key, bytes, 'font/ttf');
  return { src: `${ORIGIN}/${key}`, sha256, bytes: bytes.length };
}

const store = bucket();
const table = {};
for (const [id, face] of Object.entries(FACES)) {
  const regular = await upload(store, face.family, face.regular);
  const bold =
    face.bold === face.regular ? regular : await upload(store, face.family, face.bold);
  table[id] = { regular, bold };
  const kb = Math.round((regular.bytes + (bold === regular ? 0 : bold.bytes)) / 1024);
  console.log(`${id.padEnd(12)} ${face.family.padEnd(18)} ${String(kb).padStart(4)} KB`);
}

const path = new URL('../lib/board-fonts.ts', import.meta.url);
const source = await readFile(path, 'utf8');
const serialised = Object.entries(table)
  .map(
    ([id, files]) =>
      `  ${id}: {\n` +
      `    regular: { src: '${files.regular.src}', sha256: '${files.regular.sha256}', bytes: ${files.regular.bytes} },\n` +
      `    bold: { src: '${files.bold.src}', sha256: '${files.bold.sha256}', bytes: ${files.bold.bytes} },\n` +
      `  },`,
  )
  .join('\n');
const next = source.replace(
  /export const BOARD_FONTS: Partial<Record<FontId, FontFiles>> = \{[\s\S]*?\};/,
  `export const BOARD_FONTS: Partial<Record<FontId, FontFiles>> = {\n${serialised}\n};`,
);
if (next === source) throw new Error('Could not find the table in lib/board-fonts.ts');
await writeFile(path, next);
console.log(`\nWrote ${Object.keys(table).length} faces into lib/board-fonts.ts`);
