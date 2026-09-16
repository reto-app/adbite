/* Create a Checkout Setup session for a campaign the signed-in advertiser
   already created. The webhook, not the browser return URL, marks it live. */

import { json, service, userFrom } from '../../lib/server/db.js';
import { appOrigin, stripe } from '../../lib/server/stripe.js';
import { randomBytes } from 'node:crypto';

export const config = { runtime: 'nodejs' };

export async function POST(request: Request): Promise<Response> {
  const db = service();
  const user = await userFrom(request, db);
  if (!user) return json(401, { message: 'Sign in first' });
  let campaignId = '';
  try {
    const body = (await request.json()) as { campaignId?: unknown };
    campaignId = typeof body.campaignId === 'string' ? body.campaignId : '';
  } catch { return json(400, { message: 'Unreadable request' }); }
  const { data: campaign } = await db.from('campaigns').select('id, advertiser_id').eq('id', campaignId).maybeSingle();
  if (!campaign || campaign.advertiser_id !== user.id) return json(404, { message: 'No such campaign' });

  const { data: account } = await db.from('accounts').select('stripe_customer_id').eq('id', user.id).maybeSingle();
  const client = stripe();
  let customerId = account?.stripe_customer_id;
  if (!customerId) {
    const customer = await client.customers.create({ email: user.email ?? undefined, metadata: { account_id: user.id } });
    customerId = customer.id;
    await db.from('accounts').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }
  const origin = appOrigin();
  const session = await client.checkout.sessions.create({
    mode: 'setup', customer: customerId,
    // Let Stripe select eligible payment methods from the Dashboard. This is
    // also how Checkout stays compatible as methods are added or removed.
    integration_identifier: `adbite_setup_${randomBytes(4).toString('hex')}`,
    setup_intent_data: { metadata: { campaign_id: campaign.id, advertiser_id: user.id } },
    metadata: { campaign_id: campaign.id, advertiser_id: user.id },
    success_url: `${origin}/dashboard?payment=ready`, cancel_url: `${origin}/dashboard?payment=cancelled`,
  });
  if (!session.url) return json(502, { message: 'Stripe did not return Checkout.' });
  return json(200, { url: session.url });
}
