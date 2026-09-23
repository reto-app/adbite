/* The shop's own film, cut to the pane it plays in.
 *
 * A display board -- no prices, the shop's footage on a loop, the strip along
 * the foot sold to somebody else -- gives that footage the screen less the
 * strip. A file made for the whole screen sits in that pane with bars down
 * two sides, which on the board shape we sell most is the shop's own material
 * looking broken.
 *
 * So this looks up a copy cut to the pane and queues one for any source that
 * has none yet. A piece with no staged cut is left out of the board rather
 * than shown badly, which is the same rule turned.ts follows and the same
 * rule every other asset here follows: the screen goes without it for a poll
 * or two, and comes back right.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StageFrame } from '../compose.js';

export type StagedFile = { storage_path: string; sha256: string; bytes: number; seconds: number };

/** A source to cut and how long the cut may run. */
export type Source = { path: string; seconds: number };

export async function stagedFiles(
  db: SupabaseClient,
  sources: Source[],
  frame: StageFrame,
): Promise<Map<string, StagedFile>> {
  const found = new Map<string, StagedFile>();
  const wanted = new Map<string, number>();
  for (const source of sources) {
    if (source.path && !wanted.has(source.path)) wanted.set(source.path, source.seconds);
  }
  if (wanted.size === 0) return found;

  const { data } = await db
    .from('staged_videos')
    .select('source_path, storage_path, sha256, bytes, seconds')
    .eq('turn', frame.turn)
    .eq('fit_width', frame.width)
    .eq('fit_height', frame.height)
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
    /* The unique index makes a repeat call a no-op, so ten screens on the
       same pane asking in the same minute cost one job. */
    await db.rpc('enqueue_stage_job', {
      path,
      direction: frame.turn,
      width: frame.width,
      height: frame.height,
      max_seconds: seconds,
    });
  }
  return found;
}
