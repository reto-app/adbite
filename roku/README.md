# AdBite Board — Roku channel

The wall half of AdBite. A sideloaded Roku channel that draws a shop's menu
board and plays the ads booked against it, at 1920×1080, forever, with nobody
touching the remote.

It renders the same `Board` the web dashboard edits — same sections, prices,
badges, themes, review foot, and the same `adShare` split — so what a shop
approves in the browser is what goes on the wall.

## Where the board comes from

There is no database yet, and a Roku cannot read `localStorage`. So the board
travels **inside the package**: `board.json` sits at the root of the zip, and a
shop gets a new zip when their menu changes. That is the whole pipeline, and it
needs no server at all.

The channel is built so that stops being true without a rewrite. On every
launch and every refresh it resolves, first hit wins:

1. `remoteUrl` — a hosted `board.json`, from the package, the device registry,
   or a launch argument
2. `cachefs:/board.json` — the last good remote copy, so a dead uplink at 6am
   still shows yesterday's menu
3. `pkg:/board.json` — the packaged copy, always present

The packaged copy goes up immediately, before the network is consulted, so the
board is on the wall while the fetch is still in flight. When there is a backend
to point at, set `remoteUrl` in the export and the TVs become polling clients.

A poll sends `If-None-Match` for the board it is currently showing, so an
unchanged menu costs a 304 and never redraws the wall. Artwork named relative
to the board (`ads/c1.jpg`) is resolved against wherever the board came from —
`pkg:/` inside a package, the fetch URL over HTTP.

## This machine as the server

For testing the polling path before there is a backend, `tools/serve.sh` serves
a board off this machine and puts it on the public internet through a
Cloudflare quick tunnel — no account, no config:

```bash
tools/serve.sh                           # -> https://something.trycloudflare.com/board.json
tools/serve.sh dist/export/board.json    # serve a specific export
tools/serve.sh --local                   # LAN only, no tunnel
```

It logs every poll, and Roku's user agent is distinctive, so you can watch the
TV come and get it. The board is read from disk per request: edit `board.json`,
wait for the next poll, done.

Then point a TV at it without taking it down off the wall:

```bash
tools/point.sh 192.168.1.42 https://something.trycloudflare.com/board.json
tools/point.sh 192.168.1.42 default      # back to the packaged board
```

That relaunches the channel over ECP with the URL as a launch argument, and the
channel writes it to the device registry, so it survives a reboot.

**A quick tunnel gets a new hostname every run.** A TV pointed at yesterday's
tunnel is polling a dead host — it will keep showing the cached board and the
OPTIONS overlay will say what it is trying to reach. Re-run `tools/point.sh`
after each `tools/serve.sh`. For anything longer-lived than an afternoon, use a
named Cloudflare tunnel or a real host.

## The universal package

`universal/board.json` names a sync server instead of a menu. A TV running
that package registers itself with `POST /api/device/register`, shows a
six-character pairing code, and polls `POST /api/device/sync` every ten
minutes once a shop has claimed it from the dashboard's **Your TVs** tab.
The response is the same board.json shape, composed on the server from the
shop's saved board and the spots it has approved; every asset it names is
downloaded to `cachefs:` and verified by size before the board is shown, so
nothing streams. Plays ride along in the same request.

```bash
tools/build.sh universal/board.json   # the package every shop gets
```

A spot marked `loop` never finishes, so it cannot report itself the way a
spot that takes a turn does. The channel reports one record a minute for as
long as such a spot is on the wall, carrying the seconds that actually
elapsed; the server splits those minutes across the campaigns the reel was
stitched from. That is what makes a second screen billable at all.

`tools/point.sh <ip> <url>` still works for a hand-served board; a stored
`remoteUrl` is only consulted when the package has no `syncUrl`.

## Getting it onto a TV

Put the Roku in developer mode — on the remote:

```
Home Home Home  Up Up  Right Left Right Left Right
```

Accept the agreement, set a password, let it reboot. Note the IP it shows.

```bash
tools/build.sh                      # -> dist/adbite-board.zip
ROKU_IP=192.168.1.42 ROKU_PASS=board tools/deploy.sh
```

To package a specific shop's export instead of the sample:

```bash
tools/build.sh ~/Downloads/bao-pao-wow-board.json
```

Artwork referenced as `ads/<file>` is picked up from an `ads/` directory beside
that `board.json`.

Bump `build_version` in `manifest` for each package you hand a shop — the Roku
refuses a sideload that is byte-identical to what is already installed, and the
number is what tells two packages apart on the About screen.

## Seeing it without a TV

`tools/preview.py` is a second implementation of the layout, off the same
`board.json`, at the same 1920×1080:

```bash
python3 tools/preview.py                      # -> dist/preview/{morning,midday,evening}.png
python3 tools/preview.py some-board.json -o /tmp/out
```

It prints the scale each board settled on and says `CLIPPED` when a menu will
not fit even at the floor. It exists because the fit pass is the one part of
this channel that fails quietly rather than loudly, and because the alternative
to checking is sideloading and walking over to the wall.

It is a mirror, not the source of truth. If the two disagree, the device is
right.

## On the wall

- **Polling.** `refreshAt: "04:00"` polls once a day at that local time, which
  is what a shop wants: the menu changes overnight, never mid-service.
  `refreshMinutes` is a fixed interval, which is what you want while testing;
  `refreshAt` wins when both are set. Either way the board is fetched once at
  launch, so a TV restarted after a menu change does not wait for its slot.
- **Slots.** `slotWindows` carries machine-readable minute-of-day ranges for
  the shop's own breakfast / lunch / evening boards. The scene checks every 30
  seconds and swaps when the shop's hours say to, off the device's local clock.
  A window may run past midnight.
- **Fit.** The menu shrinks to fit a long list and grows to fill a short one,
  bounded by a readability floor (0.62), a ceiling (1.75), and by the longest
  item name still fitting its column. Columns are split at whichever break
  evens them out, never mid-section. A short menu is centred vertically. A menu
  that still overflows takes the review bar's strip before it clips.
- **Ads.** One shape per board, `adLayout`: a `rail` down the right or a
  `banner` along the foot, sized by `adShare`. `full` and `video` campaigns take
  the whole screen for their turn and hand it back. Nothing booked draws the
  same hatched "Ad space" placeholder the dashboard preview does. Artwork that
  will not decode is dropped from the rotation rather than held as a blank.
- **Screensaver.** A Roku with video playing does not raise its screensaver, so
  the scene loops two muted pixels of `pkg:/media/keepawake.mp4` in the corner.
  It stands down while a video spot has the decoder. Set `keepAwake: false` in
  the board to turn it off.
- **Diagnostics.** `OPTIONS` on the remote shows the shop, the current slot,
  where the board came from, the export timestamp, the channel version and the
  device IP — which is what you need to sideload the next menu. `PLAY` re-reads
  the board.

## board.json

```jsonc
{
  "version": 1,
  "exportedAt": "2026-09-14T00:00:00.000Z",  // ISO UTC; compared as a string
  "remoteUrl": null,          // a hosted board to poll, when there is one
  "refreshAt": "04:00",       // local HH:MM, once a day. Wins over the interval
  "refreshMinutes": 15,       // fixed interval, for testing
  "keepAwake": true,
  "adLayout": "rail",         // "rail" | "banner"
  "spotSeconds": 15,
  "reviewSeconds": 12,
  "slotWindows": [
    { "id": "morning", "label": "Breakfast", "startMinute": 0, "endMinute": 660 }
  ],
  "board": { /* the web app's Board type, verbatim */ },
  "ads": [
    // src is relative to the board, or an absolute http(s) URL
    { "id": "c1", "name": "…", "format": "rail", "src": "ads/c1.jpg", "seconds": 15 },
    // "loop": true on a video spot lets the player rewind it in place, with no
    // re-open between plays; use it for a single stitched reel
    // "supplemental": true at the top level hides the menu entirely: a second
    // screen that only runs the reel. Chain every spot for a seamless loop.
    // a full-screen spot hands the wall back to the menu for one interval
    // before the next full-screen spot; "chain": true skips that hand-back
    { "id": "c2", "format": "video", "src": "ads/c2.mp4", "seconds": 12, "chain": true }
  ]
}
```

`board` is the dashboard's own type copied straight through, on purpose: the
shop's menu has one shape, and the TV should not be a second place to maintain
it. `ads` carries only spots the shop has already approved — the channel will
not be the thing that decides whether an ad may run.

## Working on it

```bash
npx brighterscript --project bsconfig.json   # validate before every sideload
python3 tools/make-art.py                    # regenerate icons, splash, star
```

`brighterscript` is validation only; the package is plain BrightScript. Three
things have already cost time here and will again: `const` is a BrighterScript
keyword the device does not have, `step` is reserved, and an associative array
is case-insensitive, so one `headers.etag` covers every casing a server sends.

Colours in `components/theme.brs` are the `.board-canvas.theme-*` values from
`app/globals.css` with the rgba alpha moved into Roku's `0xRRGGBBAA`. The sizes
in `MenuPane.brs` are that file's `cqw` figures resolved against a 1920 board.
Change the web preview and both need the same change.
