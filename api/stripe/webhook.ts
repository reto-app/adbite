/* Stripe signs this raw request body. Do not call request.json() here. */

import Stripe from 'stripe';
import { service } from '../../lib/server/db.js';
import { stripe } from '../../lib/server/stripe.js';
import { markChargeFailed, settlePayouts } from '../../lib/server/billing.js';

export const config = { runtime: 'nodejs' };

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return new Response('Missing Stripe signature', { status: 400 });
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(await request.text(), signature, secret); } catch { return new Response('Invalid Stripe signature', { status: 400 }); }
  const db = service();
  // Stripe retries until it receives a 2xx. Record the id before acting, so a
  // delivery retry never repeats a customer charge or a shop transfer.
  const { error: eventError } = await db.from('stripe_events').insert({ id: event.id, type: event.type });
  if (eventError?.code === '23505') return Response.json({ received: true, duplicate: true });
  if (eventError) return new Response('Could not record Stripe event', { status: 500 });
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const campaignId = session.metadata?.campaign_id;
    const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (session.mode === 'setup' && campaignId && setupIntentId && customerId) {
      const setup = await stripe().setupIntents.retrieve(setupIntentId);
      const paymentMethod = typeof setup.payment_method === 'string' ? setup.payment_method : setup.payment_method?.id;
      if (paymentMethod) {
        await stripe().customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethod } });
        await db.from('campaigns').update({ status: 'live' }).eq('id', campaignId).eq('status', 'in_review');
      }
    }
  }
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const chargeId = intent.metadata.charge_id;
    if (chargeId) {
      await db.from('charges').update({ stripe_payment_intent_id: intent.id, status: 'succeeded', paid_at: new Date().toISOString() }).eq('id', chargeId);
      /* The charge the money arrived on, so the shop's share can move before
         the platform balance settles. */
      const source = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
      await settlePayouts(chargeId, source);
    }
  }
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const chargeId = intent.metadata.charge_id;
    const advertiserId = intent.metadata.advertiser_id;
    if (chargeId && advertiserId) await markChargeFailed(chargeId, advertiserId);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } });
}
