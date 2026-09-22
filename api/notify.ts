/* Mail that follows something a signed-in person did.
 *
 *   POST /api/notify   Authorization: Bearer <supabase access token>
 *   { event: 'booking',  campaignId, venues: string[], dayparts: string[], minutes }
 *   { event: 'decision', campaignId, approved: boolean }
 *
 * The browser writes the rows itself (row-level security allows exactly
 * that) and then tells this function, which reads the rows back with the
 * service key, works out who should hear, and sends. Display strings the
 * client passes are only ever used in the sender's own confirmation; what a
 * shop owner reads comes from the database. A failed or unconfigured mail
 * answers 200 with `sent: false`; the booking already happened. */

import { createClient } from '@supabase/supabase-js';
import { send } from '../lib/email/send.js';
import { approvalNeeded, bookingReceived, campaignDecided } from '../lib/email/templates.js';
import { SPOT_YEARLY, isPermanent, shopEarningsFromSpend } from '../lib/pricing.js';
import { invoiceCharge } from '../lib/server/invoices.js';

export const config = { runtime: 'nodejs' };

/* Vercel's Node runtime only honours a returned Response from a named
   method export; a default export is the old (req, res) signature and its
   return value is dropped on the floor. */

const FORMAT_NAMES: Record<string, string> = {
  banner: 'Permanent spot',
  video: 'Short video',
};

type Body =
  | { event: 'booking'; campaignId: string; venues?: string[]; dayparts?: string[]; minutes?: number }
  | { event: 'decision'; campaignId: string; approved: boolean };

export async function POST(request: Request): Promise<Response> {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return json(503, { message: 'Supabase is not configured' });

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { message: 'Sign in first' });

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: auth } = await db.auth.getUser(token);
  const user = auth.user;
  if (!user) return json(401, { message: 'That session has expired' });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(400, { message: 'Unreadable request' });
  }

  const { data: campaign } = await db
    .from('campaigns')
    .select('id, advertiser_id, advertiser_name, name, format, venues, weekly_spend, spots, email')
    .eq('id', body.campaignId)
    .maybeSingle();
  if (!campaign) return json(404, { message: 'No such campaign' });

  const format = FORMAT_NAMES[campaign.format] ?? campaign.format;

  if (body.event === 'booking') {
    if (campaign.advertiser_id !== user.id) return json(403, { message: 'Not your campaign' });

    const { data: approvals } = await db
      .from('approvals')
      .select('shop_id, shops(name, owner_id, accounts:owner_id(email))')
      .eq('campaign_id', campaign.id);

    const advertiserTo = campaign.email || user.email;
    const results: boolean[] = [];
    if (advertiserTo) {
      results.push(
        await send(
          advertiserTo,
          bookingReceived({
            campaignName: campaign.name,
            format,
            venues: body.venues ?? [],
            dayparts: body.dayparts ?? [],
            weeklySpend: Number(campaign.weekly_spend),
            minutes: body.minutes ?? 0,
          }),
        ),
      );
    }
    const boards = Math.max(1, (campaign.venues ?? []).length);
    for (const row of (approvals ?? []) as unknown as {
      shops: { name: string; accounts: { email: string } | null } | null;
    }[]) {
      const ownerEmail = row.shops?.accounts?.email;
      if (!ownerEmail) continue;
      results.push(
        await send(
          ownerEmail,
          approvalNeeded({
            shopName: row.shops?.name ?? 'your shop',
            /* The same rule the approval queue follows: a shop deciding on
               a creative is told who is asking, not how to mail them. */
            advertiser: campaign.advertiser_name || 'An advertiser',
            format,
            weeklyEarnings: shopEarningsFromSpend(Number(campaign.weekly_spend), boards),
          }),
        ),
      );
    }
    return json(200, { sent: results.some(Boolean), count: results.length });
  }

  if (body.event === 'decision') {
    /* The decider must own a shop with an approval row on this campaign. */
    const { data: shop } = await db
      .from('approvals')
      .select('shop_id, status, shops!inner(name, owner_id)')
      .eq('campaign_id', campaign.id)
      .eq('shops.owner_id', user.id)
      .maybeSingle();
    if (!shop) return json(403, { message: 'Not your board' });
    const shopName = (shop as unknown as { shops: { name: string } }).shops.name;

    const { data: advertiser } = await db.from('accounts').select('email').eq('id', campaign.advertiser_id).maybeSingle();
    const to = campaign.email || advertiser?.email;
    if (!to) return json(200, { sent: false });
    const sent = await send(to, campaignDecided({ campaignName: campaign.name, shopName, approved: Boolean(body.approved) }));

    /* A permanent spot is bought outright rather than metered, so the moment
       a shop says yes is the moment there is something to invoice. Video has
       nothing to bill yet: it is invoiced weekly on what actually ran.
       `invoiceCharge` is idempotent on the charge, so a second approval on a
       multi-board booking does not raise a second invoice. */
    if (body.approved && isPermanent(campaign.format)) {
      try {
        await invoiceSpots(db as unknown as Db, campaign as SpotCampaign);
      } catch (failure) {
        /* The approval stands. An invoice that did not go out is a thing a
           person can raise again; an approval rolled back is not. */
        console.error('could not invoice spot campaign', campaign.id, failure);
      }
    }
    return json(200, { sent });
  }

  return json(400, { message: 'Unknown event' });
}

type SpotCampaign = { id: string; advertiser_id: string; name: string; spots: number | null };

/* Only the shape this function uses. Spelling out the full generated client
   type here drags Supabase's generics through a signature that does not care
   about them, and they do not line up across two call sites of createClient. */
type Db = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => { single: () => Promise<{ data: unknown }> };
    };
  };
};

/* One charge and one invoice for the whole twelve months, written against the
   ledger the weekly run also uses so both kinds of money live in one place.
   The charge has no billing run: a spot is not a week. */
async function invoiceSpots(db: Db, campaign: SpotCampaign) {
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

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
