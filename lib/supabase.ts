'use client';

/* The browser's connection to Supabase.
 *
 * One client for the whole tab, made on first use rather than at import so
 * the prerender (which has no window and no env) never touches it. Every
 * store in lib/ that used to read localStorage reads through this instead,
 * and row-level security in supabase/migrations decides what a session may
 * see; nothing here is a permission. */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when the build was given a project to talk to. */
export const configured = Boolean(URL && ANON);

export function supabase(): SupabaseClient {
  if (!client) {
    if (!URL || !ANON) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set');
    }
    client = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
