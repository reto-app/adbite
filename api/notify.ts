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
import { approvalNeeded, bookingReceived } from '../lib/email/templates.js';
import { shopEarningsFromSpend } from '../lib/pricing.js';
import {
  CAMPAIGN_FIELDS,
  mintLink,
  reviewUrl,
  settle,
  type DecidableCampaign,
} from '../lib/server/approvals.js';

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
    .select(CAMPAIGN_FIELDS)
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
      shop_id: string;
      shops: { name: string; accounts: { email: string } | null } | null;
    }[]) {
      const ownerEmail = row.shops?.accounts?.email;
      if (!ownerEmail) continue;
      /* One secret per approval row, minted here because this is the only
         place that knows a mail is about to carry it. A mint that fails
         leaves the links pointing at the dashboard rather than dropping the
         mail: a shop owner who has to sign in is inconvenienced, one who
         never hears is not told at all. */
      const token = await mintLink(db, campaign.id, row.shop_id);
      results.push(
        await send(
          ownerEmail,
          approvalNeeded({
            shopName: row.shops?.name ?? 'your shop',
            campaignName: campaign.name,
            /* The same rule the approval queue follows: a shop deciding on
               a creative is told who is asking, not how to mail them. */
            advertiser: campaign.advertiser_name || 'An advertiser',
            format,
            weeklyEarnings: shopEarningsFromSpend(Number(campaign.weekly_spend), boards),
            review: token ? { approve: reviewUrl(token, 'approve'), open: reviewUrl(token) } : undefined,
          }),
        ),
      );
    }
    return json(200, { sent: results.some(Boolean), count: results.length });
  }

  if (body.event === 'decision') {
    /* The decider must own a shop with an approval row on this campaign. The
       browser has already written the row under row-level security; this is
       that same authorisation re-established on the server, because what
       follows mails an advertiser and can raise an invoice. */
    const { data: shop } = await db
      .from('approvals')
      .select('shop_id, status, shops!inner(name, owner_id)')
      .eq('campaign_id', campaign.id)
      .eq('shops.owner_id', user.id)
      .maybeSingle();
    if (!shop) return json(403, { message: 'Not your board' });
    const row = shop as unknown as { shop_id: string; shops: { name: string } };

    /* Shared with the mail's own landing endpoint, which arrives here with no
       session at all. Both ways of saying yes have to end in the same three
       things happening. See lib/server/approvals.ts. */
    const { sent } = await settle(db, {
      campaign: campaign as unknown as DecidableCampaign,
      shopId: row.shop_id,
      shopName: row.shops.name,
      approved: Boolean(body.approved),
    });
    return json(200, { sent });
  }

  return json(400, { message: 'Unknown event' });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
