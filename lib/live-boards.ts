'use client';

/* The boards an advertiser is choosing between, as they are right now.
 *
 * Fetched from api/network.ts rather than from the database directly: a shop's
 * board and its TVs are readable only by the shop that owns them, and the row
 * a TV authenticates against is in the same table as its name. The function
 * reads with the service role and hands back the four things this side of the
 * product needs.
 *
 * Cached per set of venues for the life of the tab, with a short age: a shop
 * saving its board mid-booking should be visible to the person booking it,
 * and refetching the same three boards on every step of a wizard should not
 * be. `boards` is the editor's own JSON, so BoardCanvas draws exactly what the
 * shop owner sees and exactly what the wall shows.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { migrated, type Board } from '@/lib/board-shape';

export type LiveDevice = {
  id: string;
  name: string;
  screen: 'menu' | 'reel';
  /** Checked in recently enough to be believed. */
  online: boolean;
  lastSeen: string | null;
  spotsTaken: number;
  spotsFree: number;
};

export type LiveBoard = {
  venueId: string;
  shopId: string;
  shopName: string;
  adPlacement: string;
  /** The shop's own board, ready for BoardCanvas. Null if it never made one. */
  board: Board | null;
  boardVersion: number;
  updatedAt: string | null;
  devices: LiveDevice[];
};

type Wire = Omit<LiveBoard, 'board'> & { board: unknown };

const FRESH_MS = 30 * 1000;

const cache = new Map<string, { at: number; boards: LiveBoard[] }>();
const inflight = new Map<string, Promise<LiveBoard[]>>();

async function fetchBoards(key: string, venues: string[]): Promise<LiveBoard[]> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return [];

  const response = await fetch(`/api/network?venues=${encodeURIComponent(venues.join(','))}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const body = (await response.json().catch(() => ({}))) as { venues?: Wire[] };
  const boards = (body.venues ?? []).map((row) => ({
    ...row,
    /* Through the same migration the editor runs, so a board written by an
       older dashboard draws here rather than throwing halfway down. */
    board: row.board ? migrated(row.board as Partial<Board>) : null,
  }));
  cache.set(key, { at: Date.now(), boards });
  return boards;
}

/** Forget what was fetched, so the next reader asks again. */
export function reloadLiveBoards() {
  cache.clear();
  inflight.clear();
}

export function useLiveBoards(venues: string[]): { ready: boolean; boards: LiveBoard[] } {
  /* Sorted so the same three shops in a different order are one cache entry
     and not two. */
  const key = [...venues].sort().join(',');
  const [state, setState] = useState<{ ready: boolean; boards: LiveBoard[] }>({
    ready: false,
    boards: [],
  });

  useEffect(() => {
    if (!key) {
      setState({ ready: true, boards: [] });
      return;
    }
    let alive = true;

    const fresh = cache.get(key);
    if (fresh && Date.now() - fresh.at < FRESH_MS) {
      setState({ ready: true, boards: fresh.boards });
      return;
    }
    /* Show what we had while the new answer is on its way, so switching back
       to a step does not blank the boards somebody was reading. */
    if (fresh) setState({ ready: true, boards: fresh.boards });

    const pending = inflight.get(key) ?? fetchBoards(key, key.split(','));
    inflight.set(key, pending);
    void pending
      .then((boards) => {
        if (alive) setState({ ready: true, boards });
      })
      .finally(() => {
        inflight.delete(key);
      });

    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}

/** The one board for a venue, or null while the answer is still coming. */
export function boardFor(boards: LiveBoard[], venueId: string) {
  return boards.find((entry) => entry.venueId === venueId) ?? null;
}
