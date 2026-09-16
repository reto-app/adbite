/* The shop owner claims a screen.
 *
 *   POST /api/device/pair   Authorization: Bearer <session>   { code, name? }
 *   -> { ok: true, deviceId }
 *
 * The code is what the TV shows on its pairing card. Binding the device to
 * the shop is the one write on `devices` the browser cannot do itself: the
 * row is nobody's until this moment, so row-level security has no owner to
 * let through. */

import { json, lowerKeys, service, userFrom } from '../../lib/server/db.js';

export const config = { runtime: 'nodejs' };

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
  const name = typeof fields.name === 'string' ? fields.name : undefined;
  const code = String(fields.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return json(400, { message: 'A pairing code is six letters and numbers.' });

  const { data: shop } = await db.from('shops').select('id, name').eq('owner_id', user.id).limit(1).maybeSingle();
  if (!shop) return json(403, { message: 'Pick "I run a shop" on the dashboard first.' });

  const { data: device } = await db.from('devices').select('id, shop_id').eq('pair_code', code).maybeSingle();
  if (!device) return json(404, { message: 'No TV is showing that code. Check it and try again; codes change when a TV is reset.' });
  if (device.shop_id && device.shop_id !== shop.id) return json(409, { message: 'That TV is already paired with another shop.' });

  const { error } = await db
    .from('devices')
    .update({ shop_id: shop.id, pair_code: null, name: name?.trim() || `${shop.name} TV` })
    .eq('id', device.id);
  if (error) return json(500, { message: error.message });

  return json(200, { ok: true, deviceId: device.id });
}
