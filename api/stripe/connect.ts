import { json, service, userFrom } from '../../lib/server/db.js';
import { appOrigin, stripe } from '../../lib/server/stripe.js';

export const config = { runtime: 'nodejs' };

/** Start (or resume) Stripe-hosted onboarding for a shop payout recipient. */
export async function POST(request: Request): Promise<Response> {
  const db = service();
  const user = await userFrom(request, db);
  if (!user) return json(401, { message: 'Sign in first' });
  const { data: shop } = await db.from('shops').select('id, name').eq('owner_id', user.id).maybeSingle();
  if (!shop) return json(403, { message: 'Only a shop owner can set up payouts' });
  const { data: account } = await db.from('accounts').select('stripe_account_id').eq('id', user.id).maybeSingle();
  const client = stripe();
  let accountId = account?.stripe_account_id;
  if (!accountId) {
    // AdBite is the merchant of record: advertisers pay the platform and it
    // transfers each shop's share after weekly billing. Accounts v2 models a
    // shop solely as a recipient, with the low-maintenance Express dashboard.
    //
    // Payment details are collected by Stripe's hosted onboarding, never by
    // us: in the US that is a bank account paid by ACH. How often it pays out
    // is the platform's payout schedule, set to monthly in the Connect
    // settings of the Stripe Dashboard, so a shop is paid once a month while
    // their balance accrues weekly as each advertiser is billed.
    const connected = await client.v2.core.accounts.create({
      contact_email: user.email ?? undefined,
      dashboard: 'express',
      defaults: {
        currency: 'usd',
        responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      },
      configuration: {
        recipient: {
          capabilities: {
            /* A recipient asks only to receive transfers. Paying that balance
               out to their bank is Stripe's side of the arrangement for this
               account type, on the platform's payout schedule. */
            stripe_balance: { stripe_transfers: { requested: true } },
          },
        },
      },
      identity: { country: 'US' },
      metadata: { shop_id: shop.id, account_id: user.id },
    });
    accountId = connected.id;
    await db.from('accounts').update({ stripe_account_id: accountId }).eq('id', user.id);
  }
  const origin = appOrigin();
  const link = await client.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        collection_options: { fields: 'eventually_due', future_requirements: 'include' },
        refresh_url: `${origin}/dashboard?connect=refresh`,
        return_url: `${origin}/dashboard?connect=return`,
      },
    },
  });
  return json(200, { url: link.url });
}
