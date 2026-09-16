#!/usr/bin/env bash
# Sideload the packaged channel onto a Roku on this network.
#
#   ROKU_IP=192.168.1.42 ROKU_PASS=board tools/deploy.sh
#   tools/deploy.sh 192.168.1.42 board
#
# The TV has to be in developer mode first: on the remote press
#   Home Home Home Up Up Right Left Right Left Right
# accept the agreement, set a password, and let it reboot. The IP is on the
# same screen, and the running board shows it again under OPTIONS.

set -euo pipefail
cd "$(dirname "$0")/.."

IP="${1:-${ROKU_IP:-}}"
PASS="${2:-${ROKU_PASS:-}}"
ZIP="dist/adbite-board.zip"

if [ -z "$IP" ] || [ -z "$PASS" ]; then
  echo "usage: ROKU_IP=<ip> ROKU_PASS=<developer password> tools/deploy.sh" >&2
  exit 1
fi
[ -f "$ZIP" ] || { echo "no $ZIP — run tools/build.sh first" >&2; exit 1; }

# `set -e` would kill the script on a curl failure before anything is printed,
# so the exit code is captured and explained instead. The installer can take a
# while to accept an upload right after the dev-mode reboot, hence the timeout.
set +e
response=$(curl -s --digest -u "rokudev:$PASS" \
  --connect-timeout 10 --max-time 180 \
  -F "mysubmit=Install" -F "archive=@$ZIP" -F "passwd=" \
  -w '\n__status=%{http_code}' \
  "http://$IP/plugin_install")
rc=$?
set -e

status=$(printf '%s' "$response" | sed -n 's/^__status=//p')
response=$(printf '%s' "$response" | sed '/^__status=/d')

if [ "$rc" -ne 0 ]; then
  case "$rc" in
    7)  why="connection refused — is the TV on, and is the installer enabled?" ;;
    28) why="timed out — TV off the network, or the installer is still starting" ;;
    *)  why="curl exit $rc" ;;
  esac
  echo "  could not reach the installer at $IP: $why" >&2
  exit 1
fi
if [ "$status" = "401" ]; then
  echo "  the Roku rejected the developer password" >&2
  exit 1
fi
if [ "$status" != "200" ]; then
  echo "  the installer answered HTTP $status" >&2
  printf '%s\n' "$response" | head -20 >&2
  exit 1
fi

# The dev server answers 200 with the outcome written into the HTML, so the
# exit code alone does not tell you whether the channel actually took.
if printf '%s' "$response" | grep -qi "Identical to previous version"; then
  echo "  already running this exact package — bump build_version in manifest"
elif printf '%s' "$response" | grep -qi "Application Received\|Install Success"; then
  echo "  installed on $IP"
else
  echo "  the Roku rejected it:" >&2
  printf '%s' "$response" | sed -n 's/.*<font color="red">\(.*\)<\/font>.*/  \1/p' >&2
  printf '%s' "$response" | grep -qi "font color" || printf '%s\n' "$response" | head -20 >&2
  exit 1
fi
