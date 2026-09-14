'use client';

/* Campaigns the advertiser has booked in this browser.
 *
 * There is no server in the pilot, so this is the whole store. Two kinds of
 * row live here and they are never mixed up:
 *
 *   real    what the person actually built and sent. It starts `in review`,
 *           because that is true: a shop owner has to approve the creative
 *           before a board will play it.
 *
 *   sample  three worked examples, loaded on demand from the empty state and
 *           removable in one click. They carry `sample: true`, are drawn with
 *           a Sample badge everywhere they appear, and exist so the analytics
 *           can be read before you have a week of your own to read.
 *
 * Nothing is seeded automatically. An empty dashboard stays empty until
 * somebody asks for the examples. */

import { useEffect, useState } from 'react';
import type { FormatId } from '@/lib/boards';
import type { AgeBand } from '@/lib/network';
import { LIVE_VENUES, VENUES } from '@/lib/network';
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
  /** Set once the shop approves and the board starts playing it. */
  startedAt?: number | null;
  /** A worked example rather than a booking somebody made. */
  sample?: boolean;
  /** The shop owner said no. It never runs and is never billed. */
  rejected?: boolean;
  /** Free text the advertiser gave the campaign at build time. */
  note?: string | null;
};

export type CampaignStatus = 'review' | 'live' | 'rejected';

export function statusOf(campaign: Pick<Campaign, 'startedAt' | 'rejected'>): CampaignStatus {
  if (campaign.rejected) return 'rejected';
  return campaign.startedAt ? 'live' : 'review';
}

/** The venues a campaign actually booked, for pricing it. */
function venuesOf(campaign: Pick<Campaign, 'venues'>) {
  const chosen = VENUES.filter((venue) => campaign.venues.includes(venue.id));
  return chosen.length ? chosen : LIVE_VENUES;
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

function patch(id: string, change: Partial<Campaign>) {
  write(read().map((campaign) => (campaign.id === id ? { ...campaign, ...change } : campaign)));
}

/* The shop owner's decision, made on their side of the product and read on the
   advertiser's. Approving is what starts the clock: until a board is actually
   playing the spot there is nothing to report and nothing to bill. */
export function approveCampaign(id: string) {
  patch(id, { startedAt: Date.now(), rejected: false });
}

export function rejectCampaign(id: string) {
  patch(id, { rejected: true, startedAt: null });
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

/* ---- the worked examples ------------------------------------------------ */

const DAY = 24 * 60 * 60 * 1000;

/* Three bookings that have been running long enough to have a shape: a wide
   multi-shop buy, one neighbourhood, and a single board. Loaded only when
   somebody asks for them, and every panel that draws one says Sample. */
const SAMPLES: Omit<Campaign, 'id' | 'createdAt'>[] = [
  {
    name: 'Rosewood Barbers · autumn walk-ins',
    weeklySpend: 180,
    format: 'full',
    venues: [
      'baopaowow',
      'centerst-pizza',
      'startup-coffee',
      'mural-bakery',
      'cougar-wings',
      'north-gate-poke',
    ],
    ages: ['18-24', '25-34'],
    dayparts: ['lunch', 'evening'],
    creativeName: 'rosewood-autumn.png',
    creativeSrc: null,
    email: 'hello@rosewoodbarbers.com',
    startedAt: Date.now() - 23 * DAY,
    sample: true,
    note: 'Downtown and campus, peak hours only. Walk-ins, no appointment.',
  },
  {
    name: 'North Park Dental · new patients',
    weeklySpend: 95,
    format: 'banner',
    venues: ['baopaowow', 'summit-strength', 'campus-cuts', 'cougar-wings'],
    ages: ['25-34', '35-49'],
    dayparts: ['lunch', 'afternoon', 'evening'],
    creativeName: 'northpark-checkup.jpg',
    creativeSrc: null,
    email: 'front@northparkdental.com',
    startedAt: Date.now() - 11 * DAY,
    sample: true,
    note: 'A strip under the menu, every open hour, around the campus gate.',
  },
  {
    /* Left unapproved on purpose: the shop side needs something in its queue,
       and a booking that has not been said yes to yet is the honest shape of
       what an advertiser sees while they wait. */
    name: 'Iron Rose Gym · January intake',
    weeklySpend: 70,
    format: 'rail',
    venues: ['baopaowow', 'summit-strength'],
    ages: ['18-24', '25-34'],
    dayparts: ['evening'],
    creativeName: 'ironrose-january.png',
    creativeSrc: null,
    email: 'sam@ironrosegym.com',
    startedAt: null,
    sample: true,
    note: 'First class free, two doors down. Evenings only.',
  },
  {
    name: 'Mia’s Flower Bar · weekend stems',
    weeklySpend: 45,
    format: 'video',
    venues: ['baopaowow'],
    ages: [],
    dayparts: ['evening'],
    creativeName: 'mias-stems-15s.mp4',
    creativeSrc: null,
    email: 'mia@miasflowerbar.com',
    startedAt: Date.now() - 5 * DAY,
    sample: true,
    note: 'One board, dinner only, fifteen seconds of motion.',
  },
];

export function loadSamples() {
  const existing = read().filter((campaign) => !campaign.sample);
  const seeded = SAMPLES.map((sample, index) => ({
    ...sample,
    id: `sample-${index}`,
    createdAt: (sample.startedAt ?? Date.now()) - 2 * DAY,
  }));
  write([...seeded, ...existing]);
}

export function clearSamples() {
  write(read().filter((campaign) => !campaign.sample));
}

export function hasSamples(campaigns: Campaign[]) {
  return campaigns.some((campaign) => campaign.sample);
}
