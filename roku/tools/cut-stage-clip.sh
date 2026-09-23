#!/usr/bin/env bash
# The Test Shop's film, cut the way the worker cuts a real shop's.
#
#   tools/cut-stage-clip.sh <pane width> <pane height> <turn>
#   tools/cut-stage-clip.sh 1080 1575 left
#
# The filter is stageFilter() from worker/index.mjs, kept here by hand so the
# packaged test board is cut to the same pane a synced board would be. The
# pane comes from stageFrame(); tools/make-test-board.mjs prints it.
set -euo pipefail
cd "$(dirname "$0")/.."

W="${1:?pane width}"
H="${2:?pane height}"
TURN="${3:-none}"
CLIPS=dist/export/mexico-clips
OUT=test-shop/media/tacos-loop.mp4

# libx264 will not take an odd frame, and a pane is whatever Int(H * share)
# happened to leave.
W=$((W - W % 2))
H=$((H - H % 2))

case "$TURN" in
  left)  TRANSPOSE=",transpose=1" ;;
  right) TRANSPOSE=",transpose=2" ;;
  none)  TRANSPOSE="" ;;
  *) echo "unknown turn $TURN" >&2; exit 1 ;;
esac

FILTER="scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}${TRANSPOSE},setsar=1"

list=$(mktemp)
trap 'rm -f "$list" /tmp/adbite-stage-*.mp4' EXIT
for f in f1-tacos-lemon-closeup f2-tacos-basket-rotating f3-taco-filling-timelapse f4-tacos-avocado-above; do
  ffmpeg -v error -y -i "$CLIPS/$f.mp4" -vf "$FILTER" -an \
    -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -crf 23 -preset medium -r 30 \
    "/tmp/adbite-stage-$f.mp4"
  echo "file '/tmp/adbite-stage-$f.mp4'" >> "$list"
done

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
ffmpeg -v error -y -f concat -safe 0 -i "$list" -c copy "$OUT"

ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -show_entries format=duration -of csv=p=0:s=x "$OUT"
echo "  $OUT  ($(du -h "$OUT" | cut -f1))"
