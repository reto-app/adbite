'use client';

/* What the TVs reported.
 *
 * One row per spot a screen actually put on the wall, written by the sync
 * endpoint and read here through row-level security: an advertiser sees the
 * plays on their own campaigns, a shop owner the plays on their own screens.
 * Nothing here is modelled; a campaign with no rows has not run yet, and
 * lib/delivery.ts falls back to the forecast for exactly that case. */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Measured } from '@/lib/delivery';

type Cache = { ready: boolean; byCampaign: Record<string, Measured> };

let cache: Cache = { ready: false, byCampaign: {} };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function load() {
  const { data } = await supabase().from('plays').select('campaign_id, seconds, played_at');
  const byCampaign: Record<string, Measured> = {};
  for (const row of data ?? []) {
    const at = Date.parse(row.played_at);
    const seen = byCampaign[row.campaign_id] ?? { plays: 0, seconds: 0, since: null };
    seen.plays += 1;
    seen.seconds += Number(row.seconds) || 0;
    seen.since = seen.since === null ? at : Math.min(seen.since, at);
    byCampaign[row.campaign_id] = seen;
  }
  cache = { ready: true, byCampaign };
  for (const listener of listeners) listener();
}

export function reloadPlays() {
  loading = load();
}

/** Keyed by campaign id; a campaign with no plays is simply absent. */
export function usePlays(): Cache {
  const [state, setState] = useState<Cache>({ ready: false, byCampaign: {} });
  useEffect(() => {
    if (!loading) loading = load();
    const sync = () => setState(cache);
    sync();
    listeners.add(sync);
    /* Screens report every ten minutes, so this does too. */
    const tick = setInterval(reloadPlays, 10 * 60 * 1000);
    return () => {
      listeners.delete(sync);
      clearInterval(tick);
    };
  }, []);
  return state;
}
