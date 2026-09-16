#!/usr/bin/env bash
# Serve a board from this machine and put it on the public internet.
#
#   tools/serve.sh                          serve ./board.json
#   tools/serve.sh dist/export/board.json   serve an exported one
#   tools/serve.sh --local                  skip the tunnel, LAN only
#
# Prints the URL to point a TV at, then keeps running. Ctrl-C stops both the
# server and the tunnel.
#
# The tunnel is a Cloudflare quick tunnel: no account, no config, a fresh
# https://*.trycloudflare.com hostname each run. That last part matters — the
# URL changes every time this script starts, so a TV pointed at yesterday's
# tunnel will be polling a dead host. Re-run tools/point.sh after each start.

set -euo pipefail
cd "$(dirname "$0")/.."

BOARD="board.json"
PORT=8787
TUNNEL=1

for arg in "$@"; do
  case "$arg" in
    --local) TUNNEL=0 ;;
    --port=*) PORT="${arg#*=}" ;;
    *) BOARD="$arg" ;;
  esac
done

[ -f "$BOARD" ] || { echo "no board at $BOARD" >&2; exit 1; }

cleanup() {
  [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

node server/serve.mjs "$BOARD" --port "$PORT" &
SERVER_PID=$!

# Give the listener a moment, then prove it is actually up before advertising it.
for _ in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1 && break
  sleep 0.2
done
curl -sf "http://localhost:$PORT/health" >/dev/null || { echo "the server did not come up" >&2; exit 1; }

if [ "$TUNNEL" -eq 0 ]; then
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  echo ""
  echo "  point a TV on this network at:"
  echo "    http://${LAN_IP:-<this machine>}:$PORT/board.json"
  echo ""
  wait "$SERVER_PID"
  exit 0
fi

command -v cloudflared >/dev/null || {
  echo "cloudflared is not installed. brew install cloudflared, or use --local" >&2
  exit 1
}

LOG=$(mktemp -t adbite-tunnel)
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate >"$LOG" 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 60); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  kill -0 "$TUNNEL_PID" 2>/dev/null || { echo "the tunnel exited:" >&2; tail -20 "$LOG" >&2; exit 1; }
  sleep 0.5
done
[ -n "$URL" ] || { echo "the tunnel never printed a hostname:" >&2; tail -20 "$LOG" >&2; exit 1; }

BOARD_URL="$URL/board.json"

# cloudflared prints the hostname the moment it has one, but the edge needs up
# to a minute after that before it will route. Checking once — or for only
# thirty seconds — reports a dead tunnel that is merely a slow one.
echo ""
echo "  public   $BOARD_URL"
printf '  waiting for the Cloudflare edge to route it '
READY=0
for _ in $(seq 1 90); do
  if curl -sf --max-time 5 "$BOARD_URL" >/dev/null 2>&1; then READY=1; break; fi
  printf '.'
  sleep 1
done
echo ""
[ "$READY" -eq 1 ] || { echo "  $BOARD_URL never answered" >&2; tail -20 "$LOG" >&2; exit 1; }

echo ""
echo "  serving  $BOARD"
echo ""
echo "  point a TV at it:"
echo "    tools/point.sh <roku-ip> $BOARD_URL"
echo ""
echo "  every poll is logged below. Ctrl-C stops the server and the tunnel."
echo ""

wait "$SERVER_PID"
