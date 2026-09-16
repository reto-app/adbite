/* The one request a TV makes, every ten minutes.
 *
 *   POST /api/device/sync
 *   { deviceId, secret, etag, channelVersion, plays: [{ id, at, seconds }] }
 *
 *   -> { paired: false, pairCode }          nobody has claimed this screen yet
 *   -> { unchanged: true, refreshMinutes }  the etag matches; keep what is up
 *   -> { ...board, etag }                   a new board to download and show
 *
 * It is a POST rather than a conditional GET so the TV's heartbeat and its
 * play log ride along in the same round trip: on a shop's uplink every
 * request is one to justify. `last_seen` is written on every call, which is
 * what the dashboard's "online" light reads. */

import { compose, serialize, type Spot } from '../../lib/compose.js';
import { json, lowerKeys, service, sha256 } from '../../lib/server/db.js';

export const config = { runtime: 'nodejs' };

const POLL_MINUTES = 10;

type Play = { id: string; at?: string; seconds?: number };

export async function POST(request: Request): Promise<Response> {
  let fields: Record<string, unknown>;
  try {
    fields = lowerKeys(await request.json());
  } catch {
    return json(400, { message: 'Unreadable request' });
  }
  const body = {
    deviceId: typeof fields.deviceid === 'string' ? fields.deviceid : '',
    secret: typeof fields.secret === 'string' ? fields.secret : '',
    etag: typeof fields.etag === 'string' ? fields.etag : '',
    channelVersion: typeof fields.channelversion === 'string' ? fields.channelversion : '',
    plays: (Array.isArray(fields.plays) ? fields.plays : []) as Play[],
  };
  if (!body.deviceId || !body.secret) return json(401, { message: 'deviceId and secret are required' });

  const db = service();
  const { data: device } = await db
    .from('devices')
    .select('id, shop_id, pair_code, secret_hash, screen')
    .eq('id', body.deviceId)
    .maybeSingle();
  if (!device || device.secret_hash !== sha256(body.secret)) {
    /* A device the server does not know re-registers rather than retrying
       forever with a dead identity (the row was deleted, or the DB reset). */
    return json(401, { message: 'Unknown device', reregister: true });
  }

  const now = new Date().toISOString();
  const heartbeat: Record<string, unknown> = { last_seen: now };
  if (body.channelVersion) heartbeat.channel_version = body.channelVersion;

  /* Plays first, so a board that fails to compose still keeps the log. */
  const plays = body.plays.filter((p) => p && typeof p.id === 'string' && p.id.length === 36).slice(0, 2000);
  if (plays.length) {
    await db.from('plays').insert(
      plays.map((p) => ({
        device_id: device.id,
        campaign_id: p.id,
        played_at: p.at && !Number.isNaN(Date.parse(p.at)) ? p.at : now,
        seconds: Math.max(0, Math.min(600, Number(p.seconds) || 0)),
      })),
    );
  }

  if (!device.shop_id) {
    await db.from('devices').update(heartbeat).eq('id', device.id);
    return json(200, { paired: false, pairCode: device.pair_code, refreshMinutes: 1 });
  }

  const { data: shop } = await db.from('shops').select('id, name').eq('id', device.shop_id).maybeSingle();
  const { data: boardRow } = await db
    .from('boards')
    .select('board, version, updated_at')
    .eq('shop_id', device.shop_id)
    .maybeSingle();
  if (!shop || !boardRow) {
    await db.from('devices').update(heartbeat).eq('id', device.id);
    return json(200, { paired: false, pairCode: device.pair_code, refreshMinutes: 1 });
  }

  /* Every campaign this shop has said yes to, with a creative that has
     finished processing. Nothing else reaches the wall. */
  const { data: approved } = await db
    .from('approvals')
    .select('campaigns!inner(id, name, format, status, creatives(kind, storage_path, sha256, bytes, seconds, ready))')
    .eq('shop_id', device.shop_id)
    .eq('status', 'approved');

  const origin = process.env.ASSETS_ORIGIN ?? 'https://assets.adbite.site';
  const spots: Spot[] = [];
  for (const row of (approved ?? []) as unknown as {
    campaigns: {
      id: string;
      name: string;
      format: Spot['format'];
      status: string;
      creatives: { kind: string; storage_path: string | null; sha256: string | null; bytes: number | null; seconds: number | null; ready: boolean } | null;
    };
  }[]) {
    const c = row.campaigns;
    const creative = c.creatives;
    if (!creative?.ready || !creative.storage_path || !creative.sha256 || !creative.bytes) continue;
    /* Only Checkout's signed webhook moves a campaign to live. */
    if (c.status !== 'live') continue;
    spots.push({
      campaignId: c.id,
      name: c.name,
      format: c.format,
      src: `${origin}/${creative.storage_path.replace(/^\/+/, '')}`,
      sha256: creative.sha256,
      bytes: creative.bytes,
      seconds: creative.seconds,
    });
  }

  /* A second screen plays the shop's stitched reel when the worker has one. */
  const screen = (device.screen as 'menu' | 'reel') ?? 'menu';
  let reel = null;
  if (screen === 'reel') {
    const { data: row } = await db
      .from('reels')
      .select('storage_path, sha256, bytes, seconds')
      .eq('shop_id', device.shop_id)
      .maybeSingle();
    if (row) {
      reel = {
        src: `${origin}/${row.storage_path.replace(/^\/+/, '')}`,
        sha256: row.sha256,
        bytes: row.bytes,
        seconds: Number(row.seconds),
      };
    }
  }

  const board = compose({
    shopId: shop.id,
    board: boardRow.board,
    boardVersion: boardRow.version,
    updatedAt: boardRow.updated_at,
    spots,
    screen,
    reel,
    pollMinutes: POLL_MINUTES,
  });
  const text = serialize(board);
  const etag = sha256(text).slice(0, 32);

  await db.from('devices').update({ ...heartbeat, etag_served: etag }).eq('id', device.id);

  if (body.etag && body.etag === etag) {
    return json(200, { unchanged: true, refreshMinutes: POLL_MINUTES });
  }
  return new Response(JSON.stringify({ ...board, etag }), {
    status: 200,
    headers: { 'content-type': 'application/json', etag },
  });
}
