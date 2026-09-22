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
 * An image is usable at that point. A video is handed to the render worker
 * (see worker/) and becomes usable when it comes back in a profile every
 * Roku can decode.
 *
 * The object is keyed by its own hash, so the same artwork booked twice is
 * stored once and a re-cut is a different file. That hash is also what the
 * channel names its local copy, which is why the browser computes it.
 *
 * What "really that size" is worth, and what it is not: a signed PUT that
 * answers 200 proves only that R2 accepted a request whose content-length
 * matched the signature. The payload is signed as UNSIGNED-PAYLOAD, so
 * nothing on that leg looks at the bytes. The size check below is therefore
 * the only transport check in the product, and it compares two numbers the
 * browser supplied. It catches a transfer that was cut off. It cannot catch
 * one that arrived the right length and the wrong content, and the channel
 * cannot either: ConfigTask.brs verifies a download by size and uses the hash
 * only to name the cached file.
 *
 * R2 will do the real check if the hash is signed as a header —
 * `x-amz-checksum-sha256` — and answers 400 BadDigest on a body that does not
 * match. That is what CHECKSUMS below turns on. It is off by default because
 * a browser cannot send a header the bucket's CORS policy does not allow, and
 * an object-scoped API token cannot edit that policy: turning this on before
 * the header is on the allow-list would fail every upload at the preflight.
 * See SETUP.md, "Artwork storage".
 */

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { json, lowerKeys, service, userFrom } from '../lib/server/db.js';

export const config = { runtime: 'nodejs' };

/* Set R2_CHECKSUM_SHA256=1 once `x-amz-checksum-sha256` is in the bucket's
   CORS AllowedHeaders. Then a corrupt upload is refused by R2 rather than
   stored and noticed afterwards. */
const CHECKSUMS = process.env.R2_CHECKSUM_SHA256 === '1';

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
      /* Without this the presigner hangs an `x-amz-checksum-crc32=AAAAAA==`
         on the query string, which is the CRC32 of an empty body and which R2
         ignores. A checksum that is never checked is worse than none: it
         reads like an integrity guarantee in the URL and is not one. */
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
  };
}

type Store = ReturnType<typeof bucket>;

/* Somewhere to PUT a file, and the headers the browser must send with it.
   The headers come from here rather than being spelled out in the browser so
   that turning CHECKSUMS on is a server-side change: the client sends what it
   was handed, whatever that turns out to be. */
async function signedPut(
  store: Store,
  key: string,
  contentType: string,
  bytes: number,
  sha256: string,
): Promise<{ uploadUrl: string; uploadHeaders: Record<string, string> }> {
  const digest = CHECKSUMS ? Buffer.from(sha256, 'hex').toString('base64') : null;
  const uploadUrl = await getSignedUrl(
    store.client,
    new PutObjectCommand({
      Bucket: store.name,
      Key: key,
      ContentType: contentType,
      ContentLength: bytes,
      CacheControl: 'public, max-age=31536000, immutable',
      ...(digest ? { ChecksumSHA256: digest } : {}),
    }),
    {
      expiresIn: 600,
      /* Keeps the checksum in the signed headers instead of the query string,
         which is what makes it something the browser has to send and R2 has
         to verify. */
      ...(digest ? { unhoistableHeaders: new Set(['x-amz-checksum-sha256']) } : {}),
    },
  );
  return {
    uploadUrl,
    uploadHeaders: {
      'content-type': contentType,
      ...(digest ? { 'x-amz-checksum-sha256': digest } : {}),
    },
  };
}

/* An object that failed its check is not left in the bucket.
 *
 * It matters more here than it would elsewhere because the key is the file's
 * own hash, so it is shared: a truncated upload of a file somebody else
 * already uploaded successfully lands on top of theirs. Clearing it keeps a
 * failed attempt from outliving itself, and the guard keeps this from being
 * the thing that deletes a file some other row is live on. */
async function discard(store: Store, key: string | null, stillUsed: () => Promise<boolean>) {
  if (!key) return;
  if (await stillUsed()) return;
  try {
    await store.client.send(new DeleteObjectCommand({ Bucket: store.name, Key: key }));
  } catch {
    /* Best effort. The row is not marked ready either way, so nothing plays
       it; a leftover object costs storage and not correctness. */
  }
}

/* Two different failures wearing one sentence.
 *
 * Short means the transfer stopped partway, which retrying usually fixes and
 * which is what the original message described. Any other mismatch does not
 * mean that at all: the object under this key is a different length from the
 * file the browser said it was sending, and since the key is the file's own
 * hash, that is either a stale object from another attempt or two files
 * disagreeing about the same hash. Telling somebody to "try again" when the
 * problem is the wrong file at that address sends them round the loop. */
function sizeComplaint(landed: number, declared: number) {
  return landed < declared
    ? 'The upload was cut short. Try again.'
    : 'That file does not match what was sent. Upload it again.';
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

  const url = new URL(request.url);
  const finishing = url.searchParams.get('done') === '1';
  /* Two things can be uploaded and they are not the same thing: an
     advertiser's creative, which a shop approves and an advertiser pays for,
     and a shop's own footage, which nobody approves and nobody is billed
     for. They share a bucket and nothing else. */
  const forShop = url.searchParams.get('for') === 'shop';
  const store = bucket();

  if (finishing && forShop) {
    const mediaId = String(fields.mediaid ?? '');
    const { data: media } = await db
      .from('shop_media')
      .select('id, shop_id, storage_path, bytes, kind, shops!inner(owner_id)')
      .eq('id', mediaId)
      .maybeSingle();
    const owner = (media as unknown as { shops?: { owner_id: string } } | null)?.shops?.owner_id;
    if (!media || owner !== user.id) return json(404, { message: 'No such upload' });

    /* Another row already playing this exact file. The key is the file's own
       hash, so that is a real possibility and not a defensive flourish. */
    const mediaStillUsed = async () => {
      const { data } = await db
        .from('shop_media')
        .select('id')
        .eq('storage_path', media.storage_path!)
        .eq('ready', true)
        .neq('id', media.id)
        .limit(1);
      return Boolean(data?.length);
    };

    try {
      const head = await store.client.send(new HeadObjectCommand({ Bucket: store.name, Key: media.storage_path! }));
      const landed = head.ContentLength ?? 0;
      if (landed !== media.bytes) {
        await discard(store, media.storage_path, mediaStillUsed);
        return json(409, { message: sizeComplaint(landed, media.bytes ?? 0) });
      }
    } catch {
      return json(409, { message: 'That file did not finish uploading. Try again.' });
    }

    const origin = process.env.ASSETS_ORIGIN ?? 'https://assets.adbite.site';
    const mediaUrl = `${origin}/${media.storage_path}`;
    if (media.kind === 'video') {
      await db.from('render_jobs').insert({ kind: 'transcode_media', shop_media_id: media.id });
      await db.from('render_jobs').insert({ kind: 'reel', shop_id: media.shop_id });
      return json(200, { ready: false, processing: true, url: mediaUrl });
    }
    await db.from('shop_media').update({ ready: true }).eq('id', media.id);
    await db.from('render_jobs').insert({ kind: 'reel', shop_id: media.shop_id });
    return json(200, { ready: true, url: mediaUrl });
  }

  if (finishing) {
    const creativeId = String(fields.creativeid ?? '');
    const { data: creative } = await db
      .from('creatives')
      .select('id, advertiser_id, storage_path, bytes, kind')
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
    if (size !== (creative.bytes ?? 0)) {
      await discard(store, creative.storage_path, async () => {
        const { data } = await db
          .from('creatives')
          .select('id')
          .eq('storage_path', creative.storage_path!)
          .eq('ready', true)
          .neq('id', creative.id)
          .limit(1);
        return Boolean(data?.length);
      });
      return json(409, { message: sizeComplaint(size, creative.bytes ?? 0) });
    }

    const origin = process.env.ASSETS_ORIGIN ?? 'https://assets.adbite.site';
    const url = `${origin}/${creative.storage_path}`;

    /* An image is ready the moment it has landed. A video is not: it goes to
       the render worker first, which re-encodes it to something every Roku
       decodes. The advertiser can preview the file they uploaded meanwhile;
       no board carries it until the worker says so. */
    if (creative.kind === 'video') {
      await db.from('render_jobs').insert({ kind: 'transcode', creative_id: creative.id });
      return json(200, { ready: false, processing: true, url });
    }

    await db.from('creatives').update({ ready: true }).eq('id', creative.id);
    return json(200, { ready: true, url });
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

  if (forShop) {
    const { data: shop } = await db.from('shops').select('id').eq('owner_id', user.id).maybeSingle();
    if (!shop) return json(403, { message: 'Only a shop owner can add media to a board' });
    const mediaKey = `shop-media/${sha256}.${type.ext}`;
    const { data: existingCount } = await db.from('shop_media').select('id').eq('shop_id', shop.id);
    const { data: media, error: mediaError } = await db
      .from('shop_media')
      .insert({
        shop_id: shop.id,
        kind: type.kind,
        name,
        storage_path: mediaKey,
        bytes,
        sha256,
        width,
        height,
        seconds,
        position: existingCount?.length ?? 0,
        ready: false,
      })
      .select('id')
      .single();
    if (mediaError || !media) return json(500, { message: mediaError?.message ?? 'Could not start the upload' });

    const put = await signedPut(store, mediaKey, contentType, bytes, sha256);
    return json(200, { mediaId: media.id, key: mediaKey, ...put });
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

  const put = await signedPut(store, key, contentType, bytes, sha256);

  return json(200, { creativeId: creative.id, key, ...put });
}
