#!/usr/bin/env bash
# Everything that must be true before a build is packaged for the Store.
#
# The packager signs whatever is sideloaded at that moment, so this runs the
# checks and leaves the package on the TV ready for the Packager page. It
# refuses rather than warns: a Store submission that fails certification
# costs weeks, and every check here takes seconds.
#
#   tools/preflight.sh <roku-ip> <dev password>

set -euo pipefail
cd "$(dirname "$0")/.."

IP="${1:-${ROKU_IP:-}}"
PASS="${2:-${ROKU_PASS:-}}"

fail() { echo "  ✗ $1" >&2; exit 1; }
pass() { echo "  ✓ $1"; }

echo "Checking the channel"

# BrightScript must compile clean; the device is less forgiving than we are.
npx brighterscript --project bsconfig.json >/tmp/adbite-bs.log 2>&1 \
  || fail "brighterscript reported problems: see /tmp/adbite-bs.log"
grep -qiE "error|warning" /tmp/adbite-bs.log \
  && fail "brighterscript reported problems: see /tmp/adbite-bs.log"
pass "brightscript compiles clean"

# A Label that overflows is cut off silently, and the pairing screen carries
# the one instruction a reviewer needs.
screens=$(python3 tools/preview.py --screens-only -o dist/preview 2>&1)
echo "$screens" | grep -q CLIPPED && { echo "$screens"; fail "a screen clips its own text"; }
pass "pairing and screensaver screens fit"

# Roku prohibits an app from interfering with the system screensaver.
grep -rqi "keepawake" components/ source/ 2>/dev/null \
  && fail "the keep-awake screensaver override is back; certification forbids it"
pass "nothing overrides the screensaver"

# Somebody else's trademark has no business in our package.
if grep -rqiE "quick ?quack|crumbl" demo-board.json universal/board.json 2>/dev/null; then
  fail "a real brand's marks are in a board that ships"
fi
pass "no third-party brands in the shipped boards"

# The reviewer's way past a pairing code they cannot use.
[ -f demo-board.json ] || fail "demo-board.json is missing; a reviewer would see only a pairing code"
pass "the sample board a reviewer can reach with OK is present"

# Store artwork, to Roku's stated size.
python3 - <<'PY' || exit 1
from PIL import Image
import sys
im = Image.open("images/store-poster.png")
if im.size != (540, 405): sys.exit(f"  ✗ store poster is {im.size}, Roku wants (540, 405)")
if im.mode != "RGB": sys.exit(f"  ✗ store poster is {im.mode}; it must not be transparent")
print("  ✓ store poster is 540x405 and opaque")
PY

echo
echo "Building and sideloading, so the Packager signs this exact code"
tools/build.sh universal/board.json
if [ -n "$IP" ] && [ -n "$PASS" ]; then
  ROKU_IP="$IP" ROKU_PASS="$PASS" tools/deploy.sh
  echo
  echo "Now open http://$IP and use the Packager page. See docs/ROKU-STORE.md."
else
  echo
  echo "  no TV given, so nothing was sideloaded."
  echo "  tools/preflight.sh <roku-ip> <dev password>"
fi
