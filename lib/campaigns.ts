'use client';

/* Campaigns the signed-in advertiser has booked in this browser.
 *
 * There is no server in the pilot, so this is the whole store. Nothing is
 * seeded: the dashboard starts empty and only ever shows bookings the person
 * actually made. */

import { useEffect, useState } from 'react';
import type { FormatId } from '@/lib/boards';
import type { AgeBand, Daypart } from '@/lib/network';

const KEY = 'adbite.campaigns';

export const RATE_PER_MINUTE = 0.03;

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
};

export function minutesFor(weeklySpend: number) {
  return Math.round(weeklySpend / RATE_PER_MINUTE);
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
