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
import { turnedFiles, type Turn } from '../../lib/server/turned.js';

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
    storage: fields.storage as Record<string, unknown> | undefined,
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
  /* What the screen says its own disk is doing. A Roku's cache can be
     evicted under it, and a TV that refuses remote key presses cannot be
     asked in person, so it tells us on every sync instead. */
  if (body.storage && typeof body.storage === 'object') {
    heartbeat.assets_state = { ...body.storage, at: now };
  }

  /* Plays first, so a board that fails to compose still keeps the log.
     A screen showing a stitched reel reports one record per minute under the
     id `reel`, because the file is several campaigns and it cannot know
     which one is on screen at any instant; those are expanded below. */
  const reported = body.plays.slice(0, 2000);
  const direct = reported.filter((p) => p && typeof p.id === 'string' && p.id.length === 36);
  const reelSeconds = reported
    .filter((p) => p && p.id === 'reel')
    .reduce((total, p) => total + Math.max(0, Math.min(600, Number(p.seconds) || 0)), 0);

  const rows = direct.map((p) => ({
    device_id: device.id,
    campaign_id: p.id,
    played_at: p.at && !Number.isNaN(Date.parse(p.at)) ? p.at : now,
    seconds: Math.max(0, Math.min(600, Number(p.seconds) || 0)),
  }));

  if (reelSeconds > 0 && device.shop_id) {
    const { data: reelRow } = await db
      .from('reels')
      .select('segments')
      .eq('shop_id', device.shop_id)
      .maybeSingle();
    const segments = (reelRow?.segments ?? []) as { campaign_id: string | null; seconds: number }[];
    /* Share out the looping time by how much of the reel each spot is, using
       the segments' own total so the parts add back up to the time the wall
       actually showed rather than to the file's length after its dissolves. */
    const whole = segments.reduce((total, segment) => total + (Number(segment.seconds) || 0), 0);
    if (whole > 0) {
      for (const segment of segments) {
        /* A segment with no campaign is the shop's own footage. It counts
           toward the whole, so the advertising is billed only for its real
           share of the loop, but nobody is charged for it. */
        if (!segment.campaign_id) continue;
        const share = (Number(segment.seconds) || 0) / whole;
        if (share <= 0) continue;
        rows.push({
          device_id: device.id,
          campaign_id: segment.campaign_id,
          played_at: now,
          seconds: Math.round(reelSeconds * share * 100) / 100,
        });
      }
    }
  }

  if (rows.length) await db.from('plays').insert(rows);

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
    .select('campaigns!inner(id, name, format, status, creatives(kind, storage_path, original_path, sha256, bytes, seconds, ready))')
    .eq('shop_id', device.shop_id)
    .eq('status', 'approved');

  const origin = process.env.ASSETS_ORIGIN ?? 'https://assets.adbite.site';
  const url = (path: string) => `${origin}/${path.replace(/^\/+/, '')}`;

  /* A TV hung on its end needs every film rotated in the file. The board
     says which way it was turned; `null` is a landscape screen. */
  const boardTurn: Turn | null =
    boardRow.board?.orientation === 'portrait' ? ((boardRow.board.turn as Turn) ?? 'left') : null;

  const spots: Spot[] = [];
  /* Each film's source and length, keyed by its spot or piece id, for the swap. */
  const videoPaths = new Map<string, { path: string; seconds: number }>();
  for (const row of (approved ?? []) as unknown as {
    campaigns: {
      id: string;
      name: string;
      format: Spot['format'];
      status: string;
      creatives: { kind: string; storage_path: string | null; original_path: string | null; sha256: string | null; bytes: number | null; seconds: number | null; ready: boolean } | null;
    };
  }[]) {
    const c = row.campaigns;
    const creative = c.creatives;
    if (!creative?.ready || !creative.storage_path || !creative.sha256 || !creative.bytes) continue;
    /* Only Checkout's signed webhook moves a campaign to live. */
    if (c.status !== 'live') continue;
    /* Turned from the upload itself where we still have it, so a vertical
       film is not first cropped to landscape. */
    if (creative.kind === 'video') videoPaths.set(c.id, { path: creative.original_path ?? creative.storage_path, seconds: creative.seconds ?? 15 });
    spots.push({
      campaignId: c.id,
      name: c.name,
      format: c.format,
      src: url(creative.storage_path),
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
      .select('storage_path, sha256, bytes, seconds, turn')
      .eq('shop_id', device.shop_id)
      .maybeSingle();
    /* A reel built for the other way of hanging the screen would play
       sideways. Skip it until the worker has rebuilt it; the fall-through is
       the ordinary rotation, which is a worse picture but the right way up. */
    if (row && (row.turn ?? null) === boardTurn) {
      reel = {
        src: url(row.storage_path),
        sha256: row.sha256,
        bytes: row.bytes,
        seconds: Number(row.seconds),
      };
    }
  }

  /* The shop's own media, which nobody is billed for. A piece plays on
     every TV unless the shop narrowed it to some, in which case only those
     screens get it. A board the shop uploads is nothing but this plus the
     advertising. */
  const { data: mediaRows } = await db
    .from('shop_media')
    .select('id, name, kind, storage_path, original_path, sha256, bytes, seconds, hold_seconds')
    .eq('shop_id', device.shop_id)
    .eq('ready', true)
    .or(`device_ids.is.null,device_ids.cs.{${device.id}}`)
    .order('position');
  const media = (mediaRows ?? [])
    .filter((row) => row.storage_path && row.sha256 && row.bytes)
    .map((row) => {
      if (row.kind === 'video') videoPaths.set(row.id, { path: row.original_path ?? row.storage_path!, seconds: Number(row.seconds) || 15 });
      return {
        id: row.id,
        name: row.name,
        kind: row.kind as 'image' | 'video',
        src: url(row.storage_path!),
        sha256: row.sha256!,
        bytes: row.bytes!,
        seconds: row.kind === 'video' ? Number(row.seconds) || 15 : row.hold_seconds,
      };
    });

  /* Portrait: every film is replaced by its turned copy, or dropped from
     this board until the worker has made one. Stills rotate on the device. */
  let shownSpots = spots;
  let shownMedia = media;
  if (boardTurn) {
    const turned = await turnedFiles(db, [...videoPaths.values()], boardTurn);
    const swap = <T extends { id: string; src: string; sha256: string; bytes: number }>(item: T, key: string): T | null => {
      const source = videoPaths.get(key);
      if (!source) return item;
      const file = turned.get(source.path);
      if (!file) return null;
      return { ...item, src: url(file.storage_path), sha256: file.sha256, bytes: file.bytes, seconds: file.seconds };
    };
    shownSpots = spots
      .map((spot) => swap({ ...spot, id: spot.campaignId }, spot.campaignId))
      .filter((spot): spot is Spot & { id: string } => spot !== null);
    shownMedia = media
      .map((piece) => swap(piece, piece.id))
      .filter((piece): piece is (typeof media)[number] => piece !== null);
  }

  const board = compose({
    shopId: shop.id,
    board: boardRow.board,
    boardVersion: boardRow.version,
    updatedAt: boardRow.updated_at,
    spots: shownSpots,
    screen,
    reel,
    media: shownMedia,
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
