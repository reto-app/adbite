/* One booking, while it is still being built.
 *
 * An advertiser picks shops, then picks a space on each shop's board, then
 * picks which of that shop's TVs it runs on, then gives each one artwork. That
 * is a line per shop, and the whole thing is a basket of them — which is the
 * shape the product actually sells, and was not the shape the builder had:
 * it used to take one format, one spend and one file and spread them across
 * every shop at once, so a permanent spot in a taqueria and fifteen seconds of
 * video in a gym were two trips through the same wizard.
 *
 * A line prices itself, because the two things being sold are priced in
 * different shapes and the totals have to keep them apart: a permanent spot
 * is invoiced once for its term, video is invoiced weekly on the hours that
 * actually ran, and adding them into one number would be a lie in whichever
 * unit it was printed in.
 *
 * Pure. No React, no network. The dashboard holds the lines in state and
 * lib/campaigns.ts turns each one into a row.
 */

import { spotCost, videoCost, type SpotTerm } from '@/lib/pricing';
import type { Creative } from '@/components/campaign/creative-step';

/** What is being bought. Where a still one is drawn — the strip under the
    menu or the column beside it — is the shop's own setting, not a second
    product: the advertiser buys a permanent spot and the board says where its
    spots go. */
export type Space = 'banner' | 'video';

export type Line = {
  venueId: string;
  shopId: string | null;
  /** Null until a space is chosen, which is also how "not this shop" reads. */
  space: Space | null;
  term: SpotTerm;
  /** Video only: hours a week. */
  hours: number;
  /** The TVs this runs on. Empty means none chosen yet. */
  deviceIds: string[];
  creative: Creative | null;
};

export function emptyLine(venueId: string, shopId: string | null): Line {
  return { venueId, shopId, space: null, term: 'year', hours: 4, deviceIds: [], creative: null };
}

/** The spaces a board actually offers, from where its owner said ads may sit. */
export function spacesFor(placement: string | undefined): Space[] {
  if (placement === 'banner' || placement === 'rail') return ['banner'];
  if (placement === 'rotation') return ['video'];
  return [];
}

/** True once this line is a booking rather than a shop somebody scrolled past. */
export function isBooked(line: Line) {
  return line.space !== null && line.deviceIds.length > 0;
}

/** Everything needed before it can be submitted. */
export function isComplete(line: Line) {
  return isBooked(line) && line.creative !== null;
}

/* What one line costs, in the two units it can be owed in. A spot is `once`
   and nothing else; video is `weekly` and nothing else. Never added together
   here, and never added together on screen. */
export function costOf(line: Line): { once: number; weekly: number } {
  if (!isBooked(line)) return { once: 0, weekly: 0 };
  if (line.space === 'banner') return { once: spotCost(line.deviceIds.length, line.term), weekly: 0 };
  return { once: 0, weekly: videoCost(line.hours) };
}

export function totalOf(lines: Line[]): { once: number; weekly: number } {
  return lines.reduce(
    (sum, line) => {
      const cost = costOf(line);
      return { once: sum.once + cost.once, weekly: sum.weekly + cost.weekly };
    },
    { once: 0, weekly: 0 },
  );
}

/** The lines that are actually being bought, in the order the shops were picked. */
export function booked(lines: Line[]) {
  return lines.filter(isBooked);
}

/** Artwork is per line, so this is what stands between a basket and a booking. */
export function missingArtwork(lines: Line[]) {
  return booked(lines).filter((line) => !line.creative);
}
