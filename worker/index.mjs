/* The machine that runs ffmpeg.
 *
 * Two jobs, both of which exist because a Roku should never stream:
 *
 *   transcode  an advertiser's MP4 becomes a file every Roku can decode:
 *              H.264 High 4.1, yuv420p, 1080p30, faststart, under the size a
 *              shop's uplink can fetch in a morning. Until it is done the
 *              creative is not `ready` and no board will carry it.
 *
 *   reel       every spot a shop has approved, stitched into one file with
 *              half-second dissolves. A second screen loops that single file
 *              and never re-opens anything, so there is no dark gap between
 *              clips. Built whenever the shop's approved set stops matching
 *              what the current reel was built from.
 *
 * Failures are recorded on the job and retried twice; a creative whose
 * transcode fails three times stays unplayable rather than reaching a wall
 * as a black rectangle. */

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? 10);
const REEL_SCAN_SECONDS = Number(process.env.REEL_SCAN_SECONDS ?? 60);
const WORK_DIR = process.env.WORK_DIR ?? '/tmp/adbite';
const ONCE = process.argv.includes('--once');

/* What a Roku will always decode, at a size a shop's uplink can fetch.
   CRF 23 at 1080p30 puts a 15-second spot around 3 MB. */
const VIDEO_ARGS = [
  '-an',
  '-c:v', 'libx264',
  '-profile:v', 'high',
  '-level', '4.1',
  '-pix_fmt', 'yuv420p',
  '-crf', '23',
  '-preset', 'medium',
  '-r', '30',
  '-movflags', '+faststart',
];
const MAX_SPOT_SECONDS = 20;
const MAX_MEDIA_SECONDS = 60;
const REEL_CRF = 25;
const DISSOLVE = 0.5;

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET ?? 'adbite-assets';

const log = (...parts) => console.log(new Date().toISOString(), ...parts);
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/* ---- shell ---------------------------------------------------------------- */

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stdout.on('data', (chunk) => (err += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(err);
      /* ffmpeg says everything on stderr, so the tail is the useful part. */
      else reject(new Error(`${command} exited ${code}: ${err.trim().split('\n').slice(-4).join(' ')}`));
    });
  });
}

async function probeSeconds(path) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  return Number.parseFloat(out.trim()) || 0;
}

/* ---- storage -------------------------------------------------------------- */

async function download(key, path) {
  const object = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await writeFile(path, Buffer.from(await object.Body.transformToByteArray()));
}

async function upload(path, key, contentType) {
  const body = await readFile(path);
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return { bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') };
}

function hashOf(path) {
  return readFile(path).then((body) => createHash('sha256').update(body).digest('hex'));
}

/* ---- transcode ------------------------------------------------------------ */

async function transcode(job, dir) {
  const { data: creative } = await db
    .from('creatives')
    .select('id, storage_path, name, kind')
    .eq('id', job.creative_id)
    .maybeSingle();
  if (!creative) throw new Error('creative is gone');
  if (creative.kind !== 'video') {
    /* An image needs no work; mark it playable and move on. */
    await db.from('creatives').update({ ready: true }).eq('id', creative.id);
    return;
  }

  const source = join(dir, 'in.mp4');
  const output = join(dir, 'out.mp4');
  const poster = join(dir, 'poster.jpg');
  await download(creative.storage_path, source);

  const sourceSeconds = await probeSeconds(source);
  if (sourceSeconds <= 0) throw new Error('video has no readable duration');
  const seconds = Math.min(sourceSeconds, MAX_SPOT_SECONDS);
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-i', source,
    '-t', String(seconds),
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
    ...VIDEO_ARGS,
    output,
  ]);
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.min(1, seconds / 3)), '-i', output, '-frames:v', '1', '-q:v', '4', poster]);

  const sha = await hashOf(output);
  const key = `creatives/${sha}.mp4`;
  const posterKey = `creatives/${sha}-poster.jpg`;
  const { bytes } = await upload(output, key, 'video/mp4');
  await upload(poster, posterKey, 'image/jpeg');

  await db
    .from('creatives')
    .update({ storage_path: key, poster_path: posterKey, sha256: sha, bytes, seconds, ready: true })
    .eq('id', creative.id);
  log(`transcoded ${creative.name}: ${(bytes / 1048576).toFixed(1)} MB, ${seconds.toFixed(1)}s`);
}

/* A shop's own footage needs exactly what an advertiser's does: a Roku is no
   more forgiving about one than the other. */
async function transcodeMedia(job, dir) {
  const { data: media } = await db
    .from('shop_media')
    .select('id, shop_id, storage_path, name, kind')
    .eq('id', job.shop_media_id)
    .maybeSingle();
  if (!media) throw new Error('media is gone');
  if (media.kind !== 'video') {
    await db.from('shop_media').update({ ready: true }).eq('id', media.id);
    return;
  }

  const source = join(dir, 'in.mp4');
  const output = join(dir, 'out.mp4');
  const poster = join(dir, 'poster.jpg');
  await download(media.storage_path, source);

  const sourceSeconds = await probeSeconds(source);
  if (sourceSeconds <= 0) throw new Error('video has no readable duration');
  /* A shop's own film may run longer than an ad; it is their board. */
  const seconds = Math.min(sourceSeconds, MAX_MEDIA_SECONDS);
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-i', source,
    '-t', String(seconds),
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
    ...VIDEO_ARGS,
    output,
  ]);
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.min(1, seconds / 3)), '-i', output, '-frames:v', '1', '-q:v', '4', poster]);

  const sha = await hashOf(output);
  const key = `shop-media/${sha}.mp4`;
  const posterKey = `shop-media/${sha}-poster.jpg`;
  const { bytes } = await upload(output, key, 'video/mp4');
  await upload(poster, posterKey, 'image/jpeg');
  await db
    .from('shop_media')
    .update({ storage_path: key, poster_path: posterKey, sha256: sha, bytes, seconds, ready: true })
    .eq('id', media.id);
  log(`transcoded shop media ${media.name}: ${(bytes / 1048576).toFixed(1)} MB, ${seconds.toFixed(1)}s`);
}

/* ---- reels ---------------------------------------------------------------- */

/** The spots a shop has approved, in a stable order, with their files. */
async function approvedFor(shopId) {
  const { data } = await db
    .from('approvals')
    .select('campaign_id, campaigns!inner(id, status, creatives(storage_path, kind, ready, seconds))')
    .eq('shop_id', shopId)
    .eq('status', 'approved');
  return (data ?? [])
    .map((row) => row.campaigns)
    .filter((c) => c && c.status !== 'paused' && c.status !== 'ended' && c.creatives?.ready && c.creatives.storage_path)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The shop's own footage, which shares the reel but is never billed. */
async function mediaFor(shopId) {
  const { data } = await db
    .from('shop_media')
    .select('id, storage_path, kind, seconds, hold_seconds, ready')
    .eq('shop_id', shopId)
    .eq('ready', true)
    .order('position');
  return (data ?? []).filter((item) => item.storage_path);
}

function fingerprint(parts) {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

/* One file, dissolving from each clip into the next, with an image held for
   its spot length so a still and a video can share a reel. */
/* `items` are the reel in order: each is a file, how long it holds, and the
   campaign it should be billed to, if any. A shop's own footage has none,
   which is what makes it free to run. */
async function buildReel(shopId, items, dir) {
  const inputs = [];
  const parts = [];
  let index = 0;
  for (const item of items) {
    const local = join(dir, `clip${index}.${item.kind === 'video' ? 'mp4' : 'img'}`);
    await download(item.storagePath, local);
    const seconds = item.seconds;
    if (item.kind === 'video') {
      inputs.push('-i', local);
    } else {
      inputs.push('-loop', '1', '-t', String(seconds), '-i', local);
    }
    parts.push({ seconds, campaignId: item.campaignId ?? null });
    index += 1;
  }

  const filters = parts.map(
    (_, i) => `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p,setpts=PTS-STARTPTS,settb=AVTB[v${i}]`,
  );
  let previous = 'v0';
  let total = parts[0].seconds;
  for (let i = 1; i < parts.length; i += 1) {
    const out = i === parts.length - 1 ? 'vout' : `x${i}`;
    filters.push(`[${previous}][v${i}]xfade=transition=fade:duration=${DISSOLVE}:offset=${(total - DISSOLVE).toFixed(3)}[${out}]`);
    previous = out;
    total = total + parts[i].seconds - DISSOLVE;
  }

  const output = join(dir, 'reel.mp4');
  const args = ['-y', '-v', 'error', ...inputs];
  if (parts.length === 1) {
    args.push('-filter_complex', filters[0], '-map', '[v0]');
  } else {
    args.push('-filter_complex', filters.join(';'), '-map', '[vout]');
  }
  args.push('-an', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-crf', String(REEL_CRF), '-preset', 'medium', '-r', '30', '-movflags', '+faststart', output);
  await run('ffmpeg', args);
  /* What the reel is made of, so the seconds a screen spends looping it can
     be credited to the campaigns inside it. */
  /* Shop footage is recorded with no campaign so the split below can count
     its seconds toward the whole and bill none of them. */
  const segments = parts.map((part) => ({ campaign_id: part.campaignId, seconds: part.seconds }));
  return { output, seconds: total, segments };
}

async function reelFor(shopId, dir) {
  const spots = await approvedFor(shopId);
  const media = await mediaFor(shopId);

  /* The shop's own footage first, then what it was paid to carry. A board
     should read as the shop's, with advertising in it. */
  const items = [
    ...media.map((item) => ({
      storagePath: item.storage_path,
      kind: item.kind,
      seconds: item.kind === 'video' ? Math.max(2, Number(item.seconds) || 15) : Math.max(2, Number(item.hold_seconds) || 12),
      campaignId: null,
    })),
    ...spots.map((spot) => ({
      storagePath: spot.creatives.storage_path,
      kind: spot.creatives.kind,
      seconds: spot.creatives.kind === 'video' ? Math.max(2, Number(spot.creatives.seconds) || 15) : 12,
      campaignId: spot.id,
    })),
  ];
  const built = fingerprint(items.map((item) => `${item.storagePath}:${item.seconds}`));

  const { data: existing } = await db.from('reels').select('built_from').eq('shop_id', shopId).maybeSingle();
  if (items.length === 0) {
    if (existing) await db.from('reels').delete().eq('shop_id', shopId);
    return false;
  }
  if (existing?.built_from === built) return false;

  const { output, seconds, segments } = await buildReel(shopId, items, dir);
  const sha = await hashOf(output);
  const key = `reels/${sha}.mp4`;
  const { bytes } = await upload(output, key, 'video/mp4');
  await db.from('reels').upsert({
    shop_id: shopId,
    storage_path: key,
    sha256: sha,
    bytes,
    seconds,
    segments,
    built_from: built,
    built_at: new Date().toISOString(),
  });
  log(`reel for ${shopId}: ${media.length} own + ${spots.length} booked, ${seconds.toFixed(0)}s, ${(bytes / 1048576).toFixed(1)} MB`);
  return true;
}

/** Shops with a second screen, which are the only ones that need a reel. */
async function shopsWantingReels() {
  const { data: screens } = await db.from('devices').select('shop_id').eq('screen', 'reel').not('shop_id', 'is', null);
  const { data: withMedia } = await db.from('shop_media').select('shop_id').eq('ready', true);
  return [...new Set([...(screens ?? []), ...(withMedia ?? [])].map((row) => row.shop_id))];
}

/* ---- the loop ------------------------------------------------------------- */

async function workOnce() {
  /* A Postgres function declared `returns render_jobs` hands back a composite
     whose fields are all null when it found nothing, not a null row. So the
     id is what says whether there was work, not the object. */
  const { data: job } = await db.rpc('claim_render_job');
  if (!job?.id) return false;

  const dir = join(WORK_DIR, job.id);
  await mkdir(dir, { recursive: true });
  try {
    if (job.kind === 'transcode') await transcode(job, dir);
    else if (job.kind === 'transcode_media') await transcodeMedia(job, dir);
    else if (job.kind === 'reel') await reelFor(job.shop_id, dir);
    await db.from('render_jobs').update({ status: 'done', error: null, finished_at: new Date().toISOString() }).eq('id', job.id);
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : String(failure);
    log(`job ${job.id} (${job.kind}) failed: ${message}`);
    /* Back to the queue unless it has had its three goes. */
    await db
      .from('render_jobs')
      .update({ status: job.attempts >= 3 ? 'failed' : 'queued', error: message, finished_at: new Date().toISOString() })
      .eq('id', job.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  return true;
}

async function scanReels() {
  for (const shopId of await shopsWantingReels()) {
    /* This is a safety net for rows created before the triggers in the
       migration existed. The actual render still travels through the queue,
       so its retries and errors are visible in render_jobs. */
    const { error } = await db.rpc('enqueue_reel_job', { target_shop_id: shopId });
    if (error) throw new Error(`could not queue reel for ${shopId}: ${error.message}`);
  }
}

async function main() {
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    if (!process.env[name]) throw new Error(`${name} is not set`);
  }
  await mkdir(WORK_DIR, { recursive: true });
  log('worker up');

  if (ONCE) {
    while (await workOnce());
    await scanReels();
    log('worker done (--once)');
    return;
  }

  let lastScan = 0;
  for (;;) {
    try {
      const did = await workOnce();
      if (Date.now() - lastScan > REEL_SCAN_SECONDS * 1000) {
        lastScan = Date.now();
        await scanReels();
      }
      if (!did) await sleep(POLL_SECONDS);
    } catch (failure) {
      log('loop error:', failure instanceof Error ? failure.message : failure);
      await sleep(POLL_SECONDS);
    }
  }
}

main().catch((failure) => {
  log('fatal:', failure instanceof Error ? failure.message : failure);
  process.exit(1);
});
