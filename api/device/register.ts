/* A TV's first breath.
 *
 *   POST /api/device/register   { channelVersion }
 *   -> { deviceId, secret, pairCode }
 *
 * The channel calls this once, on first launch, and keeps the answer in the
 * device registry. The secret is what every later sync is signed with; only
 * its hash is stored. The pair code is what the shop owner types into the
 * dashboard to claim the screen. */

import { json, pairCode, secret, service, sha256 } from '../../lib/server/db.js';

export const config = { runtime: 'nodejs' };

export async function POST(request: Request): Promise<Response> {
  let body: { channelVersion?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* an empty body is fine */
  }

  const db = service();
  const plain = secret();

  /* Codes are short, so a collision is possible; try a few. */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = pairCode();
    const { data, error } = await db
      .from('devices')
      .insert({ pair_code: code, secret_hash: sha256(plain), channel_version: body.channelVersion ?? null, last_seen: new Date().toISOString() })
      .select('id')
      .single();
    if (data) return json(200, { deviceId: data.id, secret: plain, pairCode: code });
    if (error && !/duplicate|unique/i.test(error.message)) return json(500, { message: error.message });
  }
  return json(500, { message: 'Could not allocate a pairing code' });
}
