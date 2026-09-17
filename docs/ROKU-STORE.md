# Getting AdBite Board into the Roku Streaming Store

Written 2026-09-17. Sideloading is how a TV gets the channel today, and it
does not scale past the people who can reach a TV's IP. The Store is the only
route that does: beta channels cap at **20 users and expire after 120 days**,
and private channels were switched off in 2022, so neither is a way to put a
board in a shop.

The review itself takes weeks, so file early. The channel does not have to be
finished to be submitted, only correct.

## What was blocking it, and is now fixed

**The screensaver.** Roku's certification criteria say an app is "prohibited
from overriding or interfering with Roku's system screensaver". The channel
used to loop two muted pixels of video in the corner, because a Roku playing
video never raises its screensaver. That is exactly the thing the rule names,
and it would have failed. It is gone, along with `media/keepawake.mp4`.

A board still has to stay on the wall, so this moves to the TV's own
settings, which is where it belongs and whose owner is the only person
entitled to make that call:

> **Settings → Screen saver → Wait time → Disabled**

**The channel says this itself**, because a shop does not read our
documentation and a board that blanks after ten minutes reads as broken:

- on the pairing screen, in a box under the code, which is the one moment
  somebody is looking at the TV with the remote in their hand;
- as a card over the board the first time a screen is paired, since that is
  when the code and its instructions disappear and the shop walks away. It is
  shown once per TV, closes on any key, and hides itself after ninety seconds
  so it can never sit over a shop's board all afternoon;
- in the OPTIONS overlay, which is where somebody looks when a board is
  already misbehaving.

Every signage channel on the Store lives with the same rule.

**Back.** Certification asks that Back return to the previous state and, from
the first screen, exit to the home screen. Back now closes the diagnostics
overlay, then the demo, then falls through to the system, which exits.

**A reviewer cannot use a pairing code.** They install the channel, see six
characters, and have no dashboard to type them into. Pressing **OK** on the
pairing screen now plays a complete sample board out of the package: menu,
slot clock, rotation, review bar, no account and no network. Back returns to
the code. Say so in the submission notes.

## Submitting, step by step

The order matters: the packager signs **whatever is sideloaded on the device
at that moment**, so the build goes on first and is packaged second.

### 1. Put the final build on a TV

```bash
cd roku
tools/preflight.sh <roku-ip> <dev password>
```

That runs every check that would otherwise come back as a rejection weeks
later, and refuses rather than warns:

- BrightScript compiles clean
- the pairing and screensaver screens do not clip their own text
- nothing in the channel overrides the screensaver
- no real brand's marks are in a board that ships
- the sample board a reviewer reaches with OK is present
- the store poster is 540x405 and opaque

Then it builds and sideloads, so the Packager signs this exact code.

Bump `build_version` in `manifest` first if you have already sideloaded this
exact code; a Roku refuses a byte-identical package.

### 2. Generate the signing key, once, on that TV

The key lives **on the device** and is created over telnet on port 8080.
macOS has no `telnet` any more, so use `nc`:

```bash
nc <roku-ip> 8080
```

At the prompt type `genkey` and wait. It prints a **Dev ID** and a
**password**. Both go in the password manager before you close that terminal.

**This is the one irreversible step in the whole process.** Every future
update to the channel must be signed with this same key. Lose it and there is
no recovery: it is a new listing, and every TV already running AdBite is
stranded on the version it has. Roku cannot re-issue it.

Run `genkey` once for this channel and never again on that device, or you
will replace the key you are relying on.

### 3. Package it

In a browser, open `http://<roku-ip>` and sign in as `rokudev`. Click
**Packager**:

- check the **Dev ID** matches what `genkey` printed
- App Name: `AdBite Board`, Version: matches `manifest`
- Password: the one `genkey` printed
- **Package**

Download the **`.pkg`** it produces. That signed file is what Roku receives;
the zip that `tools/build.sh` makes is only for sideloading.

### 4. Create the listing

Developer Dashboard → **Manage My Channels** → **Add Channel** → **Developer
SDK**. Choose **Public** for the Streaming Store; Beta is the 20-user,
120-day option and is only useful for testing.

Then fill in:

| | |
| --- | --- |
| Name | AdBite Board |
| Category | Utilities (there is no signage category) |
| Artwork | `roku/images/store-poster.png` — 540x405, opaque |
| Screenshots | Taken from a real TV of the sample board, not from `tools/preview.py`, which is a mirror and not the device |
| Privacy policy | https://adbite.site/privacy |
| Terms | https://adbite.site/terms |
| Package | The `.pkg` from step 3 |

Plus the content rating questionnaire.

### 5. Write the submission notes

This is where a signage app is won or lost, so do not leave it blank:

> AdBite Board is digital signage for independent shops: it shows a shop's
> menu and the local advertising booked against it. A screen is paired to a
> business account at adbite.site, so a reviewer will see a pairing code on
> first launch. **Press OK on that screen for a complete working sample
> board** — menu, day-part rotation and an example advertisement — which
> needs no account and no network. Press Back to return to the pairing code.

### 6. Submit, and expect a wait

Two to four weeks is normal for a first review. Updates after that are
usually days.

## What to expect

The likeliest rejection is not technical. A reviewer who cannot get past the
pairing screen may mark the app as having limited functionality, which is why
the OK demo and the notes matter more than anything else on this list. If it
comes back for that reason, the answer is a better demo, not an argument.

Roku's stated performance bar is a fully rendered first screen within 15
seconds; the channel draws its packaged board before it touches the network,
so that one is already comfortable.

## Until it lands

Sideloading, which needs the TV and the laptop on one network:

```bash
cd roku
tools/build.sh universal/board.json
ROKU_IP=<ip> ROKU_PASS=<dev password> tools/deploy.sh
```

Nothing else about the product needs a shared network: a paired screen talks
to adbite.site over the public internet, picks up menu edits on its ten
minute poll, and reports its plays and its disk back the same way.
