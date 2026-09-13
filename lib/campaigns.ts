'use client';

/* Campaigns the signed-in advertiser has booked in this browser.
 *
 * There is no server in the pilot, so this is the whole store. Nothing is
 * seeded: the dashboard starts empty and only ever shows bookings the person
 * actually made. */

import { useEffect, useState } from 'react';
import type { FormatId } from '@/lib/boards';
import type { AgeBand } from '@/lib/network';
import { VENUES } from '@/lib/network';
import { blendedRate, minutesFor as minutesForSpend, type Daypart } from '@/lib/pricing';

const KEY = 'adbite.campaigns';

export type Campaign = {
  id: string;
  name: string;
  createdAt: number;
  weeklySpend: number;
  format: FormatId;
  venues: string[];
  ages: AgeBand[];
  dayparts: Daypart[];
  creativeName: string | null;
  /** Dropped first if the artwork will not fit in storage. */
  creativeSrc: string | null;
  /** Where to send the booking confirmation. */
  email: string | null;
};

/** The venues a campaign actually booked, for pricing it. */
function venuesOf(campaign: Pick<Campaign, 'venues'>) {
  const chosen = VENUES.filter((venue) => campaign.venues.includes(venue.id));
  return chosen.length ? chosen : VENUES;
}

/* Minutes depend on when the ad runs now that peak costs more than the dead
   middle of the afternoon, so a campaign has to be priced against its own
   daypart mix rather than one flat rate. */
export function campaignMinutes(
  campaign: Pick<Campaign, 'venues' | 'dayparts' | 'weeklySpend' | 'format'>,
) {
  return minutesForSpend(
    campaign.weeklySpend,
    venuesOf(campaign),
    campaign.dayparts,
    campaign.format,
  );
}

/** Always per minute. Divide by four for the per-play price of a video. */
export function campaignRate(campaign: Pick<Campaign, 'venues' | 'dayparts' | 'format'>) {
  return blendedRate(venuesOf(campaign), campaign.dayparts, campaign.format);
}

const listeners = new Set<() => void>();

function read(): Campaign[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Campaign[]) : [];
  } catch {
    return [];
  }
}

function write(campaigns: Campaign[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(campaigns));
  } catch {
    // Artwork data URLs are the only thing here big enough to blow the quota,
    // so drop them and keep the bookings rather than losing both.
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify(campaigns.map((item) => ({ ...item, creativeSrc: null }))),
      );
    } catch {
      /* storage is unavailable; the list lives for this page view only */
    }
  }
  for (const listener of listeners) listener();
}

export function addCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
  const saved: Campaign = {
    ...campaign,
    id: `c${Date.now().toString(36)}`,
    createdAt: Date.now(),
  };
  write([saved, ...read()]);
  return saved;
}

export function removeCampaign(id: string) {
  write(read().filter((campaign) => campaign.id !== id));
}

/** `ready` stays false through the first paint so the prerender matches. */
export function useCampaigns(): { ready: boolean; campaigns: Campaign[] } {
  const [state, setState] = useState<{ ready: boolean; campaigns: Campaign[] }>({
    ready: false,
    campaigns: [],
  });

  useEffect(() => {
    const sync = () => setState({ ready: true, campaigns: read() });
    sync();
    listeners.add(sync);
    window.addEventListener('storage', sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return state;
}
