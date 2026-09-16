/* Artwork on its way to a wall.
 *
 *   POST /api/uploads          { name, contentType, bytes, sha256, seconds? }
 *   -> { creativeId, uploadUrl, key }
 *   POST /api/uploads?done=1   { creativeId }
 *   -> { ready: true, url }
 *
 * The browser asks for somewhere to put a file, PUTs it straight to R2 with
 * the signed URL, then tells this endpoint it is done; the server checks the
 * object is really there and really that size before it marks the creative
 * usable. Nothing a TV will play is taken on the browser's word.
 *
 * The object is keyed by its own hash, so the same artwork booked twice is
 * stored once and a re-cut is a different file. That hash is also what the
 * channel names its local copy, which is why the browser computes it.
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { json, lowerKeys, service, userFrom } from '../lib/server/db.js';

export const config = { runtime: 'nodejs' };

const MAX_IMAGE = 6 * 1024 * 1024;
const MAX_VIDEO = 12 * 1024 * 1024;
const MAX_SECONDS = 20;

const TYPES: Record<string, { kind: 'image' | 'video'; ext: string; max: number }> = {
  'image/png': { kind: 'image', ext: 'png', max: MAX_IMAGE },
  'image/jpeg': { kind: 'image', ext: 'jpg', max: MAX_IMAGE },
  'image/webp': { kind: 'image', ext: 'webp', max: MAX_IMAGE },
  'video/mp4': { kind: 'video', ext: 'mp4', max: MAX_VIDEO },
};

function bucket() {
  const account = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const name = process.env.R2_BUCKET;
  if (!account || !accessKeyId || !secretAccessKey || !name) throw new Error('R2 is not configured');
  return {
    name,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function POST(request: Request): Promise<Response> {
  const db = service();
  const user = await userFrom(request, db);
  if (!user) return json(401, { message: 'Sign in first' });

  let fields: Record<string, unknown>;
  try {
    fields = lowerKeys(await request.json());
  } catch {
    return json(400, { message: 'Unreadable request' });
  }

  const finishing = new URL(request.url).searchParams.get('done') === '1';
  const store = bucket();

  if (finishing) {
    const creativeId = String(fields.creativeid ?? '');
    const { data: creative } = await db
      .from('creatives')
      .select('id, advertiser_id, storage_path, bytes')
      .eq('id', creativeId)
      .maybeSingle();
    if (!creative || creative.advertiser_id !== user.id) return json(404, { message: 'No such upload' });

    let size = 0;
    try {
      const head = await store.client.send(new HeadObjectCommand({ Bucket: store.name, Key: creative.storage_path! }));
      size = head.ContentLength ?? 0;
    } catch {
      return json(409, { message: 'That file did not finish uploading. Try again.' });
    }
    if (size !== creative.bytes) {
      return json(409, { message: 'The upload was cut short. Try again.' });
    }

    await db.from('creatives').update({ ready: true }).eq('id', creative.id);
    const origin = process.env.ASSETS_ORIGIN ?? 'https://assets.adbite.site';
    return json(200, { ready: true, url: `${origin}/${creative.storage_path}` });
  }

  const name = String(fields.name ?? 'artwork');
  const contentType = String(fields.contenttype ?? '');
  const bytes = Number(fields.bytes ?? 0);
  const sha256 = String(fields.sha256 ?? '');
  const seconds = fields.seconds === undefined ? null : Number(fields.seconds);
  const width = fields.width === undefined ? null : Number(fields.width);
  const height = fields.height === undefined ? null : Number(fields.height);

  const type = TYPES[contentType];
  if (!type) return json(400, { message: 'Send a PNG, JPG, WEBP or MP4.' });
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > type.max) {
    return json(400, { message: `That file is over ${Math.round(type.max / (1024 * 1024))} MB.` });
  }
  if (!/^[a-f0-9]{64}$/.test(sha256)) return json(400, { message: 'Missing a checksum for the file.' });
  if (type.kind === 'video' && seconds !== null && seconds > MAX_SECONDS) {
    return json(400, { message: `A video spot runs ${MAX_SECONDS} seconds or less.` });
  }

  const key = `creatives/${sha256}.${type.ext}`;
  const { data: creative, error } = await db
    .from('creatives')
    .insert({
      advertiser_id: user.id,
      kind: type.kind,
      name,
      storage_path: key,
      bytes,
      sha256,
      width,
      height,
      seconds,
      ready: false,
    })
    .select('id')
    .single();
  if (error || !creative) return json(500, { message: error?.message ?? 'Could not start the upload' });

  const uploadUrl = await getSignedUrl(
    store.client,
    new PutObjectCommand({
      Bucket: store.name,
      Key: key,
      ContentType: contentType,
      ContentLength: bytes,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 600 },
  );

  return json(200, { creativeId: creative.id, uploadUrl, key });
}
