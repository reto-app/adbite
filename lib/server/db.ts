/* Server-only Supabase access for api/ functions. Never imported by the
   browser: the service key bypasses row-level security on purpose, so every
   function that uses it does its own authorisation first. */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';

export function service(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** The signed-in person behind a bearer token, or null. */
export async function userFrom(request: Request, db: SupabaseClient) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user ?? null;
}

export function sha256(text: string) {
  return createHash('sha256').update(text).digest('hex');
}

export function secret() {
  return randomBytes(24).toString('hex');
}

/* Six characters a person can read off a TV across a room and type without
   a second look: no 0/O, no 1/I/L, no 5/S, no 8/B. */
const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXYZ234679';
export function pairCode() {
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
