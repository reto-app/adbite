'use client';

/* Campaigns the advertiser has booked.
 *
 * Every row is what the person actually built and sent. It starts `in
 * review`, because that is true: a shop owner has to approve the creative
 * before a board will play it. There are no seeded or sample rows; an empty
 * dashboard is empty. */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ASSETS_ORIGIN } from '@/lib/creatives';
import { FORMATS, type FormatId } from '@/lib/boards';
import { DAYPARTS } from '@/lib/pricing';
import type { AgeBand } from '@/lib/network';
import { LIVE_VENUES, VENUES } from '@/lib/network';
import { VIDEO_HOURLY, VIDEO_PER_MINUTE, isPermanent, spotCost, type Daypart } from '@/lib/pricing';

export type Campaign = {
  id: string;
  name: string;
  createdAt: number;
  /* What the advertiser committed to a week. Video only: a permanent spot is
     bought outright rather than by the week, and carries zero here. */
  weeklySpend: number;
  /* Permanent bottom-banner spots bought, one per screen. Zero for video. */
  spots: number;
  format: FormatId;
  venues: string[];
  ages: AgeBand[];
  dayparts: Daypart[];
  creativeName: string | null;
  /** The public URL of the artwork, which is also what a TV downloads. */
  creativeSrc: string | null;
  /** The row in `creatives` this booking plays. */
  creativeId?: string | null;
  /** Where to send the booking confirmation. */
  email: string | null;
  /** Set once the shop approves and the board starts playing it. */
  startedAt?: number | null;
  /** A worked example rather than a booking somebody made. */
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

/* Video is one flat rate at every hour, so the minutes a week buys is
   division rather than a blend across dayparts. A permanent spot buys no
   minutes at all: it is a place on the board for a year, and the strip it
   sits in is up whenever the shop is open. */
export function campaignMinutes(campaign: Pick<Campaign, 'weeklySpend' | 'format'>) {
  if (isPermanent(campaign.format)) return 0;
  return Math.round(campaign.weeklySpend / VIDEO_PER_MINUTE);
}

/** Video hours a week, which is the unit it is bought and invoiced in. */
export function campaignHours(campaign: Pick<Campaign, 'weeklySpend' | 'format'>) {
  if (isPermanent(campaign.format)) return 0;
  return campaign.weeklySpend / VIDEO_HOURLY;
}

/** What a permanent-spot campaign is invoiced, once, for its twelve months. */
export function campaignSpotCost(campaign: Pick<Campaign, 'spots' | 'format'>) {
  return isPermanent(campaign.format) ? spotCost(campaign.spots) : 0;
}

/** Always per minute. Zero for a spot, which is never metered. */
export function campaignRate(campaign: Pick<Campaign, 'format'>) {
  return isPermanent(campaign.format) ? 0 : VIDEO_PER_MINUTE;
}

/* ---- the store ----------------------------------------------------------- */

type Row = {
  id: string;
  name: string;
  created_at: string;
  weekly_spend: number | string;
  spots?: number | null;
  format: FormatId;
  venues: string[];
  ages: AgeBand[];
  dayparts: Daypart[];
  creative_name: string | null;
  creative_id: string | null;
  creatives?: { storage_path: string | null; kind: string } | null;
  email: string | null;
  note: string | null;
  approvals?: Approval[];
};

type Approval = { shop_id: string; status: 'pending' | 'approved' | 'rejected'; decided_at: string | null };

/* Tell the server something happened so the right people get a mail. The
   rows are already written; a mail that fails is logged, never surfaced. */
async function notify(body: Record<string, unknown>) {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch (failure) {
    console.warn('notify failed', failure);
  }
}

/* Artwork previews built in this tab. A data URL can be megabytes and does
   not belong in a row; uploads to real storage are a later phase. */
const previews = new Map<string, string>();

function fromRow(row: Row, mine: string[] | null): Campaign {
  const approvals = row.approvals ?? [];
  /* A shop reads its own decision. An advertiser reads the network's: live as
     soon as any shop said yes, rejected only once every shop said no. */
  const relevant = mine ? approvals.filter((a) => mine.includes(a.shop_id)) : approvals;
  const approved = relevant.filter((a) => a.status === 'approved');
  const rejected = relevant.length > 0 && relevant.every((a) => a.status === 'rejected');
  const startedAt = approved.length
    ? Math.min(...approved.map((a) => (a.decided_at ? Date.parse(a.decided_at) : Date.now())))
    : null;
  return {
    id: row.id,
    name: row.name,
    createdAt: Date.parse(row.created_at),
    weeklySpend: Number(row.weekly_spend),
    spots: Number(row.spots ?? 0),
    format: row.format,
    venues: row.venues ?? [],
    ages: row.ages ?? [],
    dayparts: row.dayparts ?? [],
    creativeName: row.creative_name,
    creativeId: row.creative_id,
    /* The artwork itself, wherever it lives. A booking made in this tab
       before the row came back is previewed from the local copy. */
    creativeSrc: row.creatives?.storage_path
      ? `${ASSETS_ORIGIN}/${row.creatives.storage_path}`
      : previews.get(row.id) ?? null,
    email: row.email,
    note: row.note,
    startedAt,
    rejected,
  };
}

type Cache = { ready: boolean; campaigns: Campaign[] };

let cache: Cache = { ready: false, campaigns: [] };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

async function myShopIds(userId: string): Promise<string[]> {
  const { data } = await supabase().from('shops').select('id').eq('owner_id', userId);
  return (data ?? []).map((row) => row.id as string);
}

async function load() {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) {
    cache = { ready: true, campaigns: [] };
    announce();
    return;
  }
  const { data: account } = await db.from('accounts').select('role').eq('id', auth.user.id).maybeSingle();
  let rows: Campaign[] = [];

  if (account?.role === 'shop') {
    const shops = await myShopIds(auth.user.id);
    const { data } = await db
      .from('campaigns')
      .select('*, approvals(shop_id, status, decided_at), creatives(storage_path, kind)')
      .order('created_at', { ascending: false });
    rows = ((data ?? []) as Row[]).map((row) => fromRow(row, shops));
  } else {
    const { data } = await db
      .from('campaigns')
      .select('*, approvals(shop_id, status, decided_at), creatives(storage_path, kind)')
      .eq('advertiser_id', auth.user.id)
      .order('created_at', { ascending: false });
    rows = ((data ?? []) as Row[]).map((row) => fromRow(row, null));
  }

  cache = { ready: true, campaigns: rows };
  announce();
}

function ensureLoaded() {
  if (!loading) loading = load();
  return loading;
}

/** Drop the cache so the next reader fetches again (after sign-in, a switch
    of sides, or a write). */
export function reloadCampaigns() {
  loading = null;
  void ensureLoaded();
}

export async function addCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Promise<Campaign> {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error('Sign in to book a campaign');

  const { data: row, error } = await db
    .from('campaigns')
    .insert({
      advertiser_id: auth.user.id,
      name: campaign.name,
      format: campaign.format,
      venues: campaign.venues,
      dayparts: campaign.dayparts,
      ages: campaign.ages,
      weekly_spend: campaign.weeklySpend,
      spots: campaign.spots,
      creative_name: campaign.creativeName,
      creative_id: campaign.creativeId ?? null,
      email: campaign.email,
      note: campaign.note ?? null,
    })
    .select('*')
    .single();
  if (error || !row) throw new Error(error?.message ?? 'Could not save the campaign');
  if (campaign.creativeSrc) previews.set(row.id, campaign.creativeSrc);

  /* One decision per shop that is actually on the network behind a chosen
     venue. Prospects have nobody to ask, so they get no row. */
  const targets = campaign.venues.length ? campaign.venues : LIVE_VENUES.map((venue) => venue.id);
  const { data: shops } = await db.from('shops').select('id').in('venue_id', targets);
  if (shops?.length) {
    await db.from('approvals').insert(shops.map((shop) => ({ campaign_id: row.id, shop_id: shop.id })));
  }

  reloadCampaigns();

  const saved = fromRow(row as Row, null);
  void notify({
    event: 'booking',
    campaignId: saved.id,
    venues: venuesOf(saved).map((venue) => venue.name),
    dayparts: campaign.dayparts.map((id) => DAYPARTS.find((part) => part.id === id)?.label ?? id),
    minutes: campaignMinutes(saved),
    format: FORMATS.find((f) => f.id === campaign.format)?.name ?? campaign.format,
  });
  return saved;
}

export async function removeCampaign(id: string) {
  await supabase().from('campaigns').delete().eq('id', id);
  previews.delete(id);
  reloadCampaigns();
}

/* The shop owner's decision, made on their side of the product and read on the
   advertiser's. Approving is what starts the clock: until a board is actually
   playing the spot there is nothing to report and nothing to bill. */
async function decide(id: string, status: 'approved' | 'rejected') {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return;
  const shops = await myShopIds(auth.user.id);
  await db
    .from('approvals')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('campaign_id', id)
    .in('shop_id', shops);
  reloadCampaigns();
  void notify({ event: 'decision', campaignId: id, approved: status === 'approved' });
}

export function approveCampaign(id: string) {
  void decide(id, 'approved');
}

export function rejectCampaign(id: string) {
  void decide(id, 'rejected');
}

/** `ready` stays false through the first paint so the prerender matches. */
export function useCampaigns(): { ready: boolean; campaigns: Campaign[] } {
  const [state, setState] = useState<{ ready: boolean; campaigns: Campaign[] }>({
    ready: false,
    campaigns: [],
  });

  useEffect(() => {
    void ensureLoaded();
    const sync = () => setState(cache);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return state;
}

/* ---- the worked examples ------------------------------------------------ */
