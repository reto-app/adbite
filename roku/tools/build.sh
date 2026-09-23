#!/usr/bin/env bash
# Package the channel for sideloading.
#
#   tools/build.sh                  package the board.json that is checked in
#   tools/build.sh path/to/exported-board.json   package a shop's exported menu
#
# Writes dist/adbite-board.zip. A Roku reads the zip from the root, so the
# manifest has to be the top entry and not sit inside a folder.

set -euo pipefail
cd "$(dirname "$0")/.."

BOARD="${1:-board.json}"
OUT="dist/adbite-board.zip"

if [ ! -f "$BOARD" ]; then
  echo "no board at $BOARD" >&2
  exit 1
fi

node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const path = process.argv[1];
  const config = JSON.parse(readFileSync(path, "utf8"));
  const fail = (message) => { console.error(`${path}: ${message}`); process.exit(1); };

  if (!config.board) fail("no `board` key");
  if (!config.board.slots) fail("`board.slots` is missing");
  if (!Array.isArray(config.slotWindows) || !config.slotWindows.length) fail("`slotWindows` is missing");

  for (const window of config.slotWindows) {
    if (!config.board.slots[window.id]) fail(`slotWindow "${window.id}" has no menu behind it`);
  }
  for (const ad of config.ads ?? []) {
    if (ad.src && /^(https?:|pkg:)/.test(ad.src) === false && ad.src.startsWith("ads/") === false) {
      fail(`ad "${ad.id}" has a src the device cannot open: ${ad.src}`);
    }
  }
  const items = Object.values(config.board.slots)
    .flat()
    .reduce((n, section) => n + (section.items?.length ?? 0), 0);
  console.log(`  ${config.board.shopName} · ${items} items · ${(config.ads ?? []).length} spot(s)`);
' "$BOARD"

rm -rf dist/stage "$OUT"
mkdir -p dist/stage/source dist/stage/components dist/stage/images dist/stage/ads dist/stage/media

cp manifest dist/stage/
cp source/*.brs dist/stage/source/
cp components/*.xml components/*.brs dist/stage/components/
cp images/*.png dist/stage/images/
cp "$BOARD" dist/stage/board.json
# The sample the pairing screen offers with OK, so a reviewer (or a shop
# deciding whether to pair at all) can see a whole working board with no
# account and no network.
[ -f demo-board.json ] && cp demo-board.json dist/stage/demo-board.json

# Artwork referenced as `ads/<file>` has to travel with the board. The exporter
# writes them next to the board.json it produces.
ADS_DIR="$(dirname "$BOARD")/ads"
if [ -d "$ADS_DIR" ] && [ -n "$(ls -A "$ADS_DIR" 2>/dev/null)" ]; then
  cp "$ADS_DIR"/* dist/stage/ads/
fi
# The shop's own film, for a board whose top half is a loop rather than a
# list. Named relative to the board like the artwork is, and copied the same
# way, so `media/tacos-loop.mp4` resolves to pkg:/media/tacos-loop.mp4.
MEDIA_DIR="$(dirname "$BOARD")/media"
if [ -d "$MEDIA_DIR" ] && [ -n "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
  cp "$MEDIA_DIR"/* dist/stage/media/
fi
# A Roku will not unzip an empty directory, and an absent pkg:/ads is fine.
rmdir dist/stage/ads 2>/dev/null || true
rmdir dist/stage/media 2>/dev/null || true

(cd dist/stage && zip -q -r -X "../adbite-board.zip" . -x '.*')
rm -rf dist/stage

echo "  $OUT  ($(du -h "$OUT" | cut -f1))"
