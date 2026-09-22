'use client';

/* The board this browser is editing.
 *
 * The signed-in owner's shop and its board, cached for the tab. Everything
 * about what a board *is* lives in lib/board-shape.ts, which has no browser in
 * it because a Vercel function reads the same rows; this is only the caching,
 * the debounce and the write-through. It re-exports the shape so that
 * `import { ... } from '@/lib/board'` keeps working everywhere.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { migrated, starterBoard, type Board } from '@/lib/board-shape';

export * from '@/lib/board-shape';

/* ---- the store -----------------------------------------------------------
   The signed-in owner's shop and its board, cached for the tab. Edits land in
   the cache at once and reach the table half a second after the last
   keystroke, so typing a menu is not a write per character.

   That write-through is still what actually saves, but it used to be silent,
   which left a shop owner typing their prices into a page that never once
   said it had kept them. The state below is what the Save button in the
   editor reads, and pressing it skips the wait rather than doing anything
   different. */

/** Where the board stands against the row behind it. */
export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

type Cache = { ready: boolean; shopId: string | null; board: Board; save: SaveState };

let cache: Cache = { ready: false, shopId: null, board: starterBoard(), save: 'saved' };
let loading: Promise<void> | null = null;
let flush: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function setSave(save: SaveState) {
  cache = { ...cache, save };
  announce();
}

function announce() {
  for (const listener of listeners) listener();
}


async function load() {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) {
    cache = { ready: true, shopId: null, board: starterBoard(), save: 'saved' };
    announce();
    return;
  }
  const { data: shop } = await db
    .from('shops')
    .select('id, boards(board)')
    .eq('owner_id', auth.user.id)
    .limit(1)
    .maybeSingle();
  const row = (shop as { id: string; boards: { board: Board }[] | { board: Board } | null } | null) ?? null;
  const saved = row ? (Array.isArray(row.boards) ? row.boards[0]?.board : row.boards?.board) : null;
  cache = {
    ready: true,
    shopId: row?.id ?? null,
    board: saved ? migrated(saved as Board & { adShare?: number }) : starterBoard(),
    save: 'saved',
  };
  announce();
}

function ensureLoaded() {
  if (!loading) loading = load();
  return loading;
}

/** Drop the cache so the next reader fetches again (after sign-in or out). */
export function reloadBoard() {
  loading = null;
  cache = { ready: false, shopId: null, board: starterBoard(), save: 'saved' };
  void ensureLoaded();
}

async function persist() {
  const { shopId, board } = cache;
  /* Signed out, or a shop row that does not exist yet: the editor still works
     and nothing is lost, but there is nowhere to write. Saying "saved" would
     be a lie, so the state stops at dirty. */
  if (!shopId) return;
  setSave('saving');
  const db = supabase();
  /* The uploaded clip is a data URL and can be tens of megabytes; it does not
     belong in a row. It stays in the cache for this tab's preview only. */
  const stored = { ...board, media: { ...board.media, src: null } };
  try {
    const { error } = await db
      .from('boards')
      .update({ board: stored, updated_at: new Date().toISOString() })
      .eq('shop_id', shopId);
    if (error) throw error;
    await db.rpc('bump_board_version', { p_shop_id: shopId });
    await db
      .from('shops')
      .update({ name: board.shopName, ad_placement: board.adPlacement })
      .eq('id', shopId);
  } catch {
    setSave('error');
    return;
  }
  /* Anything typed while that round trip was in the air is still unsaved, and
     its own debounce is already running. Do not paint over it. */
  if (cache.board === board) setSave('saved');
}

export function saveBoard(board: Board) {
  cache = { ...cache, board, save: 'dirty' };
  announce();
  if (flush) clearTimeout(flush);
  flush = setTimeout(() => {
    flush = null;
    void persist();
  }, 500);
}

/** Write now rather than in half a second. What the Save button calls. */
export async function flushBoard() {
  if (flush) {
    clearTimeout(flush);
    flush = null;
  }
  await persist();
}

export function resetBoard() {
  saveBoard(starterBoard());
}

/** `ready` stays false through the first paint so the prerender matches. */
export function useBoard(): { ready: boolean; board: Board; save: SaveState } {
  const [state, setState] = useState<{ ready: boolean; board: Board; save: SaveState }>({
    ready: false,
    board: starterBoard(),
    save: 'saved',
  });

  useEffect(() => {
    void ensureLoaded();
    const sync = () => setState({ ready: cache.ready, board: cache.board, save: cache.save });
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return state;
}
