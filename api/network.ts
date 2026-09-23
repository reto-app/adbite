/* What an advertiser is actually buying: the boards, as they are right now.
 *
 *   GET /api/network?venues=bao-pao-wow,thai-papaya
 *   -> { venues: [{ venueId, shopId, shopName, board, devices: [...] }] }
 *
 * A campaign used to be booked against a name on a map. It is booked against
 * a screen on a wall, and the only way to choose one honestly is to see what
 * is on it — so this hands back each shop's live board, the same JSON its own
 * dashboard edits and its own TVs draw, and the TVs that are drawing it. The
 * builder renders it with the same component the shop owner uses, with the
 * advertiser's artwork in the ad slot.
 *
 * It is a function rather than a query from the browser because of what a
 * board sits next to in the database. Row-level security lets a shop read its
 * own board and nobody else's, and the fix for that would be a policy opening
 * `boards` and `devices` to every signed-in account — `devices` holds the
 * secret a TV authenticates with. So the service role reads, and this returns
 * the four fields an advertiser has any business seeing: what the screen
 * shows, what it is called, whether it is checking in, and how much of its
 * banner is already sold.
 *
 * Spots taken is counted here rather than kept on the shop, because it is a
 * fact about bookings and was being maintained by hand in lib/network.ts.
 */

import { json, service, userFrom } from '../lib/server/db.js';
/* lib/site.ts imports nothing, which is why the api/ functions can read it
   without the `@/` alias the browser build resolves. */
import { ASSETS_ORIGIN } from '../lib/site.js';

export const config = { runtime: 'nodejs' };

/** Permanent spots one banner holds. Mirrors SPOTS_PER_SCREEN. */
const SPOTS_PER_SCREEN = 10;

/** A TV that has not checked in for this long is not on the wall today. */
const STALE_MINUTES = 30;

type DeviceRow = {
  id: string;
  shop_id: string;
  name: string | null;
  screen: string | null;
  last_seen: string | null;
};

export async function GET(request: Request): Promise<Response> {
  const db = service();
  const user = await userFrom(request, db);
  if (!user) return json(401, { message: 'Sign in first' });

  const url = new URL(request.url);
  const wanted = (url.searchParams.get('venues') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (wanted.length === 0) return json(200, { venues: [] });

  const { data: shops, error } = await db
    .from('shops')
    .select('id, venue_id, name, ad_placement, screens')
    .in('venue_id', wanted);
  if (error) return json(500, { message: error.message });
  if (!shops?.length) return json(200, { venues: [] });

  const shopIds = shops.map((shop) => shop.id as string);

  const [{ data: boards }, { data: devices }, { data: booked }, { data: stages }] = await Promise.all([
    db.from('boards').select('shop_id, board, version, updated_at').in('shop_id', shopIds),
    db.from('devices').select('id, shop_id, name, screen, last_seen').in('shop_id', shopIds),
    /* Everything already holding a place in a banner: waiting on the shop
       counts, because a spot somebody is mid-way through buying is not free.
       A rejected booking is neither, and never reaches 'live'. */
    db
      .from('campaigns')
      .select('id, venues, device_ids, spots, status')
      .eq('format', 'banner')
      .in('status', ['in_review', 'live']),
    /* The first piece of each shop's own media.
     *
     * Most screens we sell are film rather than a list, and on those the
     * board JSON holds no sections — so an advertiser choosing between
     * boards was shown an empty menu with "nothing here yet" above the very
     * strip they were buying. This is the still that goes where the menu
     * would be, so the preview is the screen again. A poster frame for a
     * clip, the image itself for a still; nothing else about the row
     * crosses to the advertiser. */
    db
      .from('shop_media')
      .select('shop_id, name, kind, storage_path, poster_path, position')
      .in('shop_id', shopIds)
      .eq('ready', true)
      .order('position'),
  ]);

  const boardOf = new Map((boards ?? []).map((row) => [row.shop_id as string, row]));

  /* Ordered by position, so the first row per shop is the first thing its
     screen plays. */
  const stageOf = new Map<string, { url: string; name: string }>();
  for (const row of stages ?? []) {
    const shopId = row.shop_id as string;
    if (stageOf.has(shopId)) continue;
    const path = (row.kind === 'video' ? row.poster_path : row.storage_path) as string | null;
    if (!path) continue;
    stageOf.set(shopId, { url: `${ASSETS_ORIGIN}/${path}`, name: (row.name as string) ?? '' });
  }
  const devicesOf = new Map<string, DeviceRow[]>();
  for (const device of (devices ?? []) as DeviceRow[]) {
    const list = devicesOf.get(device.shop_id) ?? [];
    list.push(device);
    devicesOf.set(device.shop_id, list);
  }

  const stale = Date.now() - STALE_MINUTES * 60 * 1000;

  const out = shops.map((shop) => {
    const board = boardOf.get(shop.id as string);
    const mine = devicesOf.get(shop.id as string) ?? [];

    /* A booking that named no TV runs on every one the shop has, so it takes
       a place in every banner. One that named some takes a place in those. */
    const shopWide = (booked ?? []).filter(
      (row) =>
        (row.device_ids === null || (row.device_ids as string[] | null)?.length === 0) &&
        ((row.venues as string[] | null) ?? []).includes(shop.venue_id as string),
    ).length;

    /* The board's own field is what a TV reads, so it is what an advertiser
       is shown. `shops.ad_placement` is kept in step with it on every save
       (lib/board.ts) and stands in for a shop that has not saved a board. */
    const placement =
      (board?.board as { adPlacement?: string } | null)?.adPlacement ??
      (shop.ad_placement as string) ??
      'rail';

    return {
      venueId: shop.venue_id as string,
      shopId: shop.id as string,
      shopName: shop.name as string,
      adPlacement: placement,
      /* The board itself, unedited. compose() is what a TV gets; this is what
         the editor holds, which is what BoardCanvas draws. */
      board: board?.board ?? null,
      /* What is on the screen where a menu would be, for a board that has
         no menu. Null on a menu board, and on a screen with nothing on it
         yet. */
      stage: stageOf.get(shop.id as string) ?? null,
      boardVersion: board?.version ?? 0,
      updatedAt: board?.updated_at ?? null,
      devices: mine.map((device) => {
        const named = (booked ?? []).filter((row) =>
          ((row.device_ids as string[] | null) ?? []).includes(device.id),
        ).length;
        const taken = shopWide + named;
        return {
          id: device.id,
          name: device.name ?? '',
          screen: (device.screen as 'menu' | 'reel') ?? 'menu',
          online: device.last_seen ? Date.parse(device.last_seen) > stale : false,
          lastSeen: device.last_seen,
          spotsTaken: taken,
          spotsFree: Math.max(0, SPOTS_PER_SCREEN - taken),
        };
      }),
    };
  });

  /* Short and private: a board changes when its owner saves it, and an
     advertiser looking at a stale menu is choosing against the wrong wall. */
  return new Response(JSON.stringify({ venues: out }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=30' },
  });
}
