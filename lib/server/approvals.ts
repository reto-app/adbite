/* What happens when a shop decides, and the link that lets it decide from
   the mail. Server-only: everything here runs under the service key.
 *
 * There are two ways into a decision now -- the queue in the dashboard, which
 * writes the row itself under row-level security and then calls api/notify,
 * and a link in the approval mail, which arrives with no session at all. They
 * have to end in the same place: the row set, the advertiser told, and a
 * permanent spot invoiced. So the part after "the shop said yes" lives here
 * rather than in either endpoint, and both call `settle`.
 *
 * The link is a secret per approval row. Only its hash is stored (see
 * supabase/migrations/0019), it authorises exactly one campaign and one shop,
 * and it dies when the row is decided. It is not a session and it cannot be
 * turned into one. */

import type { SupabaseClient } from '@supabase/supabase-js';
import { secret, sha256 } from './db.js';
import { send } from '../email/send.js';
import { campaignDecided } from '../email/templates.js';
import { invoiceCharge } from './invoices.js';
import { SPOT_YEARLY, isPermanent } from '../pricing.js';
import { ORIGIN } from '../site.js';

/** How long a link in an approval mail keeps working. */
export const LINK_DAYS = 30;

/* The columns a decision needs, in one place so the two endpoints cannot
   drift into selecting different halves of it. */
export const CAMPAIGN_FIELDS =
  'id, advertiser_id, advertiser_name, advertiser_site, name, note, format, venues, weekly_spend, spots, email, creative_id, creatives(storage_path, kind)';

export type DecidableCampaign = {
  id: string;
  advertiser_id: string;
  advertiser_name: string | null;
  advertiser_site: string | null;
  name: string;
  note: string | null;
  format: string;
  venues: string[] | null;
  weekly_spend: number | null;
  spots: number | null;
  email: string | null;
  creatives: { storage_path: string | null; kind: string | null } | null;
};

/* ---- the link ------------------------------------------------------------ */

/** Mint a fresh secret for one approval row and return it. The caller puts it
    in a URL; the database only ever sees the hash. */
export async function mintLink(db: SupabaseClient, campaignId: string, shopId: string): Promise<string | null> {
  const token = secret();
  const { error } = await db
    .from('approvals')
    .update({ link_hash: sha256(token), link_made_at: new Date().toISOString() })
    .eq('campaign_id', campaignId)
    .eq('shop_id', shopId);
  /* A mail with no working link is worse than the old mail, which at least
     pointed at a sign-in form. If the column is not there yet -- the migration
     has not run -- say so by returning null and let the caller fall back. */
  if (error) {
    console.error('could not mint an approval link', campaignId, shopId, error.message);
    return null;
  }
  return token;
}

export function reviewUrl(token: string, intent?: 'approve') {
  const query = intent ? `?t=${token}&${intent}=1` : `?t=${token}`;
  return `${ORIGIN}/review${query}`;
}

export type OpenFailure = 'unknown' | 'expired' | 'decided';

export type OpenLink = {
  campaign: DecidableCampaign;
  shopId: string;
  shopName: string;
  boards: number;
};

/** Resolve a secret from a mail to the one row it speaks for. Every refusal is
    a plain reason the page can explain, never a bare 404: a shop owner who
    followed a link from their own inbox deserves to know which of the three
    things happened. */
export async function openLink(
  db: SupabaseClient,
  token: string,
): Promise<{ ok: true; link: OpenLink } | { ok: false; reason: OpenFailure }> {
  if (!token || !/^[0-9a-f]{48}$/.test(token)) return { ok: false, reason: 'unknown' };

  const { data: row } = await db
    .from('approvals')
    .select(`campaign_id, shop_id, status, link_made_at, shops!inner(name), campaigns!inner(${CAMPAIGN_FIELDS})`)
    .eq('link_hash', sha256(token))
    .maybeSingle();
  if (!row) return { ok: false, reason: 'unknown' };

  const link = row as unknown as {
    campaign_id: string;
    shop_id: string;
    status: string;
    link_made_at: string | null;
    shops: { name: string };
    campaigns: DecidableCampaign;
  };

  if (link.status !== 'pending') return { ok: false, reason: 'decided' };

  const madeAt = link.link_made_at ? Date.parse(link.link_made_at) : NaN;
  if (!Number.isFinite(madeAt) || Date.now() - madeAt > LINK_DAYS * 86_400_000) {
    return { ok: false, reason: 'expired' };
  }

  return {
    ok: true,
    link: {
      campaign: link.campaigns,
      shopId: link.shop_id,
      shopName: link.shops.name,
      boards: Math.max(1, (link.campaigns.venues ?? []).length),
    },
  };
}

/* ---- the decision -------------------------------------------------------- */

/** Set the row, tell the advertiser, and invoice a permanent spot. Safe to
    reach from either endpoint; it re-reads nothing it was not handed and it
    does not care how the decider was authorised. */
export async function settle(
  db: SupabaseClient,
  facts: { campaign: DecidableCampaign; shopId: string; shopName: string; approved: boolean },
): Promise<{ sent: boolean }> {
  const { campaign, shopId, approved } = facts;

  await db
    .from('approvals')
    .update({
      status: approved ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
      /* The link has done its work. Clearing it is what stops a forwarded
         mail, or the same mail opened twice, from reopening a settled
         question -- and it keeps the partial unique index small. */
      link_hash: null,
    })
    .eq('campaign_id', campaign.id)
    .eq('shop_id', shopId);

  let sent = false;
  const { data: advertiser } = await db
    .from('accounts')
    .select('email')
    .eq('id', campaign.advertiser_id)
    .maybeSingle();
  const to = campaign.email || (advertiser as { email: string } | null)?.email;
  if (to) {
    sent = await send(
      to,
      campaignDecided({ campaignName: campaign.name, shopName: facts.shopName, approved }),
    );
  }

  /* A permanent spot is bought outright rather than metered, so the moment a
     shop says yes is the moment there is something to invoice. Video has
     nothing to bill yet: it is invoiced weekly on what actually ran.
     `invoiceCharge` is idempotent on the charge, so a second approval on a
     multi-board booking does not raise a second invoice. */
  if (approved && isPermanent(campaign.format as Parameters<typeof isPermanent>[0])) {
    try {
      await invoiceSpots(db, campaign);
    } catch (failure) {
      /* The approval stands. An invoice that did not go out is a thing a
         person can raise again; an approval rolled back is not. */
      console.error('could not invoice spot campaign', campaign.id, failure);
    }
  }

  return { sent };
}

/* One charge and one invoice for the whole twelve months, written against the
   ledger the weekly run also uses so both kinds of money live in one place.
   The charge has no billing run: a spot is not a week. */
async function invoiceSpots(db: SupabaseClient, campaign: DecidableCampaign) {
  const spots = Math.max(1, Number(campaign.spots ?? 1));
  const amountCents = Math.round(spots * SPOT_YEARLY * 100);

  const { data: existing } = await db
    .from('charges')
    .select('id')
    .eq('advertiser_id', campaign.advertiser_id)
    .eq('campaign_id', campaign.id)
    .maybeSingle();

  let charge = existing as { id: string } | null;
  if (!charge) {
    const { data: created } = await db
      .from('charges')
      .insert({
        advertiser_id: campaign.advertiser_id,
        campaign_id: campaign.id,
        amount_cents: amountCents,
      })
      .select('id')
      .single();
    charge = created as { id: string } | null;
  }
  if (!charge) return;

  await invoiceCharge(
    charge.id,
    campaign.advertiser_id,
    [
      {
        description: `${campaign.name} · ${spots} permanent ${spots === 1 ? 'spot' : 'spots'}, twelve months`,
        amountCents,
      },
    ],
    'A permanent spot is invoiced once and is yours for the year. Nothing further is charged for it.',
  );
}
