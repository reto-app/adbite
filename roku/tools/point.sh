#!/usr/bin/env bash
# Point a Roku at a board URL, without taking it off the wall.
#
#   tools/point.sh 192.168.1.42 https://something.trycloudflare.com/board.json
#   tools/point.sh 192.168.1.42 default      back to the board in the package
#
# This relaunches the sideloaded channel through ECP with the URL as a launch
# argument; the channel writes it to the device registry on the way past, so it
# survives a reboot. ECP is open on every Roku on the LAN and needs no password
# — unlike sideloading, which does.

set -euo pipefail

IP="${1:-${ROKU_IP:-}}"
URL="${2:-}"

if [ -z "$IP" ] || [ -z "$URL" ]; then
  echo "usage: tools/point.sh <roku-ip> <board url | default>" >&2
  exit 1
fi

curl -sf --max-time 4 "http://$IP:8060/query/device-info" >/dev/null || {
  echo "no Roku answering on $IP:8060 — check the IP on the board's OPTIONS overlay" >&2
  exit 1
}

ENCODED=$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$URL")

curl -sf -d '' "http://$IP:8060/launch/dev?remoteUrl=$ENCODED" >/dev/null || {
  echo "the Roku refused the launch. Is the channel sideloaded?" >&2
  exit 1
}

if [ "$URL" = "default" ]; then
  echo "  $IP is back on the board inside its package"
else
  echo "  $IP is now polling $URL"
fi
echo "  press OPTIONS on the remote to confirm which board it is showing"
