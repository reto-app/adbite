/* The approval mail's landing endpoint. No session, one secret.
 *
 *   GET  /api/queue/review?t=<secret>   what the shop is being asked
 *   POST /api/queue/review              { token, approved }
 *
 * A shop owner opens the mail on a phone behind a counter. Asking them to
 * find a password first is how a queue goes stale, so the link in the mail
 * carries a secret minted for that one approval row and this reads it back.
 *
 * The GET is deliberately free of side effects. Outlook SafeLinks, corporate
 * mail gateways and a fair number of prefetchers follow every link in a
 * message before a human sees it; if opening the link were what approved the
 * booking, those would approve ads nobody ever looked at. So the link only
 * ever shows the artwork, and the answer is a POST the person makes from the
 * page. `?approve=1` in the URL is a hint to the page about which button to
 * lead with -- it decides nothing.
 *
 * What the secret authorises is one campaign and one shop. It is not a
 * session: it cannot read the owner's other shops, their money, or anything
 * else the account could reach if it were signed in. */

import { json, service } from '../../lib/server/db.js';
import { openLink, settle, type OpenFailure } from '../../lib/server/approvals.js';
import { ASSETS_ORIGIN } from '../../lib/creatives.js';
import { shopEarningsFromSpend } from '../../lib/pricing.js';

export const config = { runtime: 'nodejs' };

const FORMAT_NAMES: Record<string, string> = {
  banner: 'Permanent spot',
  video: 'Short video',
};

/* The page says something different for each, so the reason travels as a
   code rather than as a message this file writes in English. */
const REFUSAL: Record<OpenFailure, number> = { unknown: 404, expired: 410, decided: 409 };

export async function GET(request: Request): Promise<Response> {
  let db;
  try {
    db = service();
  } catch {
    return json(503, { message: 'Supabase is not configured' });
  }

  const token = new URL(request.url).searchParams.get('t') ?? '';
  const opened = await openLink(db, token);
  if (!opened.ok) return json(REFUSAL[opened.reason], { reason: opened.reason });

  const { campaign, shopName, boards } = opened.link;
  const storagePath = campaign.creatives?.storage_path ?? null;

  /* Only what the page draws, and nothing that identifies the advertiser
     beyond a name and a website. The advertiser's address is on the campaign
     row this function just read; it must not travel any further than that.
     The same rule the queue in the dashboard follows. */
  return json(200, {
    shopName,
    campaignName: campaign.name,
    advertiserName: campaign.advertiser_name,
    advertiserSite: campaign.advertiser_site,
    note: campaign.note,
    format: FORMAT_NAMES[campaign.format] ?? campaign.format,
    formatId: campaign.format,
    creativeKind: campaign.creatives?.kind ?? null,
    creativeSrc: storagePath ? `${ASSETS_ORIGIN}/${storagePath}` : null,
    weeklyEarnings: shopEarningsFromSpend(Number(campaign.weekly_spend ?? 0), boards),
  });
}

export async function POST(request: Request): Promise<Response> {
  let db;
  try {
    db = service();
  } catch {
    return json(503, { message: 'Supabase is not configured' });
  }

  let body: { token?: string; approved?: boolean };
  try {
    body = (await request.json()) as { token?: string; approved?: boolean };
  } catch {
    return json(400, { message: 'Unreadable request' });
  }
  if (typeof body.approved !== 'boolean') return json(400, { message: 'Say yes or no' });

  /* Re-opened rather than trusted from the GET: the row may have been decided
     in the dashboard, or by a second copy of this mail, in between. */
  const opened = await openLink(db, body.token ?? '');
  if (!opened.ok) return json(REFUSAL[opened.reason], { reason: opened.reason });

  const { campaign, shopId, shopName } = opened.link;
  const { sent } = await settle(db, { campaign, shopId, shopName, approved: body.approved });
  return json(200, { ok: true, approved: body.approved, sent });
}
