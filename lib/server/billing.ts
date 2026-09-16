/* Weekly delivery billing and payout settlement. This module is server-only:
   it is called by the protected cron route and by verified Stripe webhooks. */

import { FORMAT_PRICES, shopEarningsFromSpend, type Daypart } from '../pricing.js';
import { send } from '../email/send.js';
import { paymentFailed } from '../email/templates.js';
import { service } from './db.js';
import { stripe } from './stripe.js';

type Play = { id: number | string; campaign_id: string; device_id: string; played_at: string; seconds: number | string };
type Campaign = { id: string; advertiser_id: string; format: keyof typeof FORMAT_PRICES; status: string };
type Device = { id: string; shop_id: string | null };
type Shop = { id: string; owner_id: string; timezone: string };
type Account = { id: string; stripe_customer_id: string | null; stripe_account_id: string | null };

type Line = { campaignId: string; shopId: string; amountCents: number; payoutCents: number };
type Tally = { lines: Map<string, Line>; playIds: (number | string)[] };

function localDaypart(playedAt: string, timezone: string): Daypart {
  let hour = 12;
  try {
    hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date(playedAt)));
  } catch { /* malformed legacy timezone: use the peak rate rather than undercharge */ }
  return hour >= 14 && hour < 17 ? 'afternoon' : 'lunch';
}

function lineAmount(play: Play, campaign: Campaign, timezone: string) {
  const price = FORMAT_PRICES[campaign.format];
  if (!price) return 0;
  const rate = price.rates[localDaypart(play.played_at, timezone) === 'afternoon' ? 'off' : 'peak'];
  // Non-video spots are billed by actual seconds; video is billed per play.
  const dollars = price.unit === 'play' ? rate : rate * (Number(play.seconds) / 60);
  return Math.max(0, Math.round(dollars * 100));
}

/* Stripe will not take a payment under fifty cents. A week below that is
   carried into the next run rather than charged, because a rejected charge
   reads to an advertiser as a payment they have to go and fix. */
const MIN_CHARGE_CENTS = 50;

function weekBounds(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  return { start: start.toISOString(), end: end.toISOString(), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

/** Create and confirm the prior week's one charge per advertiser. Safe to run repeatedly. */
export async function billPreviousWeek(now?: Date) {
  const db = service();
  const bounds = weekBounds(now);
  const { data: run, error: runError } = await db.from('billing_runs')
    .upsert({ week_start: bounds.startDate, week_end: bounds.endDate }, { onConflict: 'week_start,week_end' })
    .select('id').single();
  if (runError || !run) throw new Error(runError?.message ?? 'Could not create billing run');

  /* Everything nobody has collected yet, not just the last seven days: a
     balance carried from a quiet week is still owed. */
  const { data: plays, error: playsError } = await db.from('plays').select('id, campaign_id, device_id, played_at, seconds')
    .is('charge_id', null).lt('played_at', bounds.end);
  if (playsError) throw new Error(playsError.message);
  if (!plays?.length) return { runId: run.id, charges: 0 };

  const campaignIds = [...new Set(plays.map((play) => play.campaign_id))];
  const deviceIds = [...new Set(plays.map((play) => play.device_id))];
  const { data: campaigns } = await db.from('campaigns').select('id, advertiser_id, format, status').in('id', campaignIds);
  const { data: devices } = await db.from('devices').select('id, shop_id').in('id', deviceIds);
  const shopIds = [...new Set((devices ?? []).flatMap((device) => device.shop_id ? [device.shop_id] : []))];
  const { data: shops } = shopIds.length ? await db.from('shops').select('id, owner_id, timezone').in('id', shopIds) : { data: [] as Shop[] };
  const advertisers = [...new Set((campaigns ?? []).map((campaign) => campaign.advertiser_id))];
  const owners = [...new Set((shops ?? []).map((shop) => shop.owner_id))];
  const { data: accounts } = await db.from('accounts').select('id, stripe_customer_id, stripe_account_id').in('id', [...advertisers, ...owners]);

  const campaignById = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign as Campaign]));
  const deviceById = new Map((devices ?? []).map((device) => [device.id, device as Device]));
  const shopById = new Map((shops ?? []).map((shop) => [shop.id, shop as Shop]));
  const accountById = new Map((accounts ?? []).map((account) => [account.id, account as Account]));
  const byAdvertiser = new Map<string, Tally>();

  for (const play of plays as Play[]) {
    const campaign = campaignById.get(play.campaign_id);
    const shopId = deviceById.get(play.device_id)?.shop_id;
    const shop = shopId ? shopById.get(shopId) : undefined;
    /* A play exists because a screen put the spot on a wall, which only
       happens after a shop approved it. So the question is whether the
       campaign has since been stopped, not whether a status column was ever
       moved to 'live' -- that column is Stripe's, and gating on it here meant
       every approved campaign delivered for free. */
    if (!campaign || !shop || campaign.status === 'paused' || campaign.status === 'ended') continue;
    const amountCents = lineAmount(play, campaign, shop.timezone);
    if (!amountCents) continue;
    const key = `${campaign.id}:${shop.id}`;
    const tally = byAdvertiser.get(campaign.advertiser_id) ?? { lines: new Map<string, Line>(), playIds: [] };
    const line = tally.lines.get(key) ?? { campaignId: campaign.id, shopId: shop.id, amountCents: 0, payoutCents: 0 };
    line.amountCents += amountCents;
    line.payoutCents += Math.round(shopEarningsFromSpend(amountCents / 100, 1) * 100);
    tally.lines.set(key, line);
    tally.playIds.push(play.id);
    byAdvertiser.set(campaign.advertiser_id, tally);
  }

  let charged = 0;
  let carried = 0;
  for (const [advertiserId, tally] of byAdvertiser) {
    const lines = tally.lines;
    const amountCents = [...lines.values()].reduce((sum, line) => sum + line.amountCents, 0);
    if (!amountCents) continue;
    /* Too small for Stripe to take. The plays stay unbilled and join next
       week's total, which is why the query above asks for everything
       uncollected rather than one week of it. */
    if (amountCents < MIN_CHARGE_CENTS) {
      carried += 1;
      continue;
    }
    const { data: existing } = await db.from('charges').select('id, stripe_payment_intent_id, status').eq('billing_run_id', run.id).eq('advertiser_id', advertiserId).maybeSingle();
    if (existing) continue;
    const { data: charge, error: chargeError } = await db.from('charges').insert({ billing_run_id: run.id, advertiser_id: advertiserId, amount_cents: amountCents }).select('id').single();
    if (chargeError || !charge) throw new Error(chargeError?.message ?? 'Could not write charge');
    await db.from('charge_lines').insert([...lines.values()].map((line) => ({ charge_id: charge.id, campaign_id: line.campaignId, shop_id: line.shopId, amount_cents: line.amountCents, payout_cents: line.payoutCents })));
    /* Claim the plays before talking to Stripe, so a run that dies midway
       cannot bill the same minute twice. */
    await markPlaysBilled(tally.playIds, charge.id);

    const customerId = accountById.get(advertiserId)?.stripe_customer_id;
    if (!customerId) {
      await markChargeFailed(charge.id, advertiserId);
      continue;
    }
    try {
      const intent = await stripe().paymentIntents.create({ amount: amountCents, currency: 'usd', customer: customerId, confirm: true, off_session: true, metadata: { charge_id: charge.id, advertiser_id: advertiserId, billing_run_id: run.id } }, { idempotencyKey: `adbite-charge-${charge.id}` });
      await db.from('charges').update({ stripe_payment_intent_id: intent.id, status: intent.status === 'succeeded' ? 'succeeded' : 'pending', paid_at: intent.status === 'succeeded' ? new Date().toISOString() : null }).eq('id', charge.id);
      if (intent.status === 'succeeded') await settlePayouts(charge.id, sourceTransactionOf(intent));
      charged += 1;
    } catch {
      await markChargeFailed(charge.id, advertiserId);
    }
  }
  return { runId: run.id, charges: charged, carried };
}

/** The charge behind a PaymentIntent, which is what a transfer draws on. */
function sourceTransactionOf(intent: { latest_charge?: unknown }): string | undefined {
  const latest = intent.latest_charge;
  if (typeof latest === 'string') return latest;
  if (latest && typeof latest === 'object' && 'id' in latest) return String((latest as { id: unknown }).id);
  return undefined;
}

async function markPlaysBilled(playIds: (number | string)[], chargeId: string) {
  const db = service();
  /* Postgres takes a large IN list badly, and a week of a busy wall is
     thousands of rows. */
  for (let at = 0; at < playIds.length; at += 500) {
    await db.from('plays').update({ charge_id: chargeId }).in('id', playIds.slice(at, at + 500));
  }
}

export async function markChargeFailed(chargeId: string, advertiserId: string) {
  const db = service();
  await db.from('charges').update({ status: 'failed' }).eq('id', chargeId);
  /* Hand the plays back to the queue. Nothing was collected for them, so
     they belong in the next run rather than in a charge that failed. */
  await db.from('plays').update({ charge_id: null }).eq('charge_id', chargeId);
  const { data: lines } = await db.from('charge_lines').select('campaign_id').eq('charge_id', chargeId);
  const ids = [...new Set((lines ?? []).map((line) => line.campaign_id))];
  if (ids.length) await db.from('campaigns').update({ status: 'paused' }).eq('advertiser_id', advertiserId).in('id', ids).eq('status', 'live');
  const { data: account } = await db.from('accounts').select('email').eq('id', advertiserId).maybeSingle();
  if (account?.email) await send(account.email, paymentFailed());
}

/** Transfer a successful charge's recorded shop shares, never more than once.
 *
 * `sourceTransaction` is the Stripe charge the money came in on. Without it a
 * transfer draws on the platform's *available* balance, and card money is not
 * available for about two business days, so an honest weekly run would fail
 * every time. Naming the charge moves the money as soon as it settles. */
export async function settlePayouts(chargeId: string, sourceTransaction?: string) {
  const db = service();
  const { data: lines } = await db.from('charge_lines').select('shop_id, payout_cents').eq('charge_id', chargeId);
  const byShop = new Map<string, number>();
  for (const line of lines ?? []) byShop.set(line.shop_id, (byShop.get(line.shop_id) ?? 0) + Number(line.payout_cents));
  const shops = [...byShop.keys()];
  if (!shops.length) return;
  const { data: shopRows } = await db.from('shops').select('id, owner_id').in('id', shops);
  const owners = (shopRows ?? []).map((shop) => shop.owner_id);
  const { data: accounts } = await db.from('accounts').select('id, stripe_account_id').in('id', owners);
  const accountByOwner = new Map((accounts ?? []).map((account) => [account.id, account.stripe_account_id]));
  for (const shop of shopRows ?? []) {
    const amount = byShop.get(shop.id) ?? 0;
    if (!amount) continue;
    const { data: existing } = await db.from('payouts').select('id, status').eq('charge_id', chargeId).eq('shop_id', shop.id).maybeSingle();
    if (existing && existing.status !== 'failed') continue;
    const { data: created } = existing
      ? { data: existing }
      : await db.from('payouts').insert({ charge_id: chargeId, shop_id: shop.id, amount_cents: amount }).select('id').single();
    const payout = created;
    const destination = accountByOwner.get(shop.owner_id);
    if (!payout || !destination) continue;
    try {
      const account = await stripe().v2.core.accounts.retrieve(destination, { include: ['configuration.recipient'] });
      /* Only transfer to a shop that can actually receive it. A shop part-way
         through onboarding is skipped, and the money stays in the platform
         balance until their next charge settles after they finish. */
      const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
      if (balance?.stripe_transfers?.status !== 'active') continue;
      const transfer = await stripe().transfers.create({
        amount,
        currency: 'usd',
        destination,
        ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
        metadata: { charge_id: chargeId, shop_id: shop.id },
      }, { idempotencyKey: `adbite-payout-${payout.id}` });
      await db.from('payouts').update({ stripe_transfer_id: transfer.id, status: 'paid', paid_at: new Date().toISOString() }).eq('id', payout.id);
    } catch {
      await db.from('payouts').update({ status: 'failed' }).eq('id', payout.id);
    }
  }
}
