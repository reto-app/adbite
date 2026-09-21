/* Video for a portrait screen.
 *
 * A Roku cannot rotate a Video node, so a film bound for a TV hung on its end
 * is rotated in the file by the render worker (migration 0017). This looks
 * those files up for a set of sources and queues a turn for any that are
 * missing. A source with no turned file yet is left out of the board: the
 * screen goes without that spot for a poll or two rather than showing it
 * sideways, which is the same rule as every other asset here. */

import type { SupabaseClient } from '@supabase/supabase-js';

export type Turn = 'left' | 'right';

export type TurnedFile = { storage_path: string; sha256: string; bytes: number; seconds: number };

/** A source to turn and how long its turned copy may run. */
export type Source = { path: string; seconds: number };

export async function turnedFiles(
  db: SupabaseClient,
  sources: Source[],
  turn: Turn,
): Promise<Map<string, TurnedFile>> {
  const found = new Map<string, TurnedFile>();
  const wanted = new Map<string, number>();
  for (const source of sources) if (source.path && !wanted.has(source.path)) wanted.set(source.path, source.seconds);
  if (wanted.size === 0) return found;

  const { data } = await db
    .from('turned_videos')
    .select('source_path, storage_path, sha256, bytes, seconds')
    .eq('turn', turn)
    .in('source_path', [...wanted.keys()]);
  for (const row of data ?? []) {
    found.set(row.source_path, {
      storage_path: row.storage_path,
      sha256: row.sha256,
      bytes: row.bytes,
      seconds: Number(row.seconds),
    });
  }

  for (const [path, seconds] of wanted) {
    if (found.has(path)) continue;
    /* The unique index makes a repeat call a no-op, so ten screens asking
       on the same minute cost one job. */
    await db.rpc('enqueue_turn_job', { path, direction: turn, max_seconds: seconds });
  }
  return found;
}
