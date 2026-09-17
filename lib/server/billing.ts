/* Weekly delivery billing and payout settlement. Server-only: called by the
   protected cron route.
 *
 * Stripe is shelved. Nothing is collected here any more -- what this does is
 * work out what each advertiser owes for the video that actually ran, write
 * the ledger rows, and raise a numbered invoice payable by bank transfer.
 * Money arriving is a separate, human step (lib/server/invoices.ts), because
 * a transfer does not announce itself.
 *
 * Only video is metered. A permanent spot is a place on a board bought for a
 * year and is invoiced once, when the shop approves it, so it never appears
 * in a weekly run. */

import { VIDEO_PER_MINUTE, isPermanent, shopEarningsFromSpend } from '../pricing.js';
import type { FormatId } from '../boards.js';
import { service } from './db.js';
import { invoiceCharge, type InvoiceLine } from './invoices.js';

type Play = { id: number | string; campaign_id: string; device_id: string; played_at: string; seconds: number | string };
type Campaign = { id: string; advertiser_id: string; name: string; format: FormatId; status: string };
type Device = { id: string; shop_id: string | null };
type Shop = { id: string; owner_id: string; timezone: string };
type Account = { id: string; stripe_customer_id: string | null; stripe_account_id: string | null };

type Line = { campaignId: string; shopId: string; amountCents: number; payoutCents: number };
type Tally = { lines: Map<string, Line>; playIds: (number | string)[] };

/* Video is one flat rate at every hour of the day, so what a minute costs no
   longer depends on when it ran and the shop's timezone no longer decides a
   price. It is still read for reporting, in lib/delivery.ts; it just does not
   set money any more. */
function lineAmount(play: Play, campaign: Campaign) {
  /* A permanent spot is not metered. If a play somehow arrives for one, it is
     a screen reporting the strip it carries all year, not a billable minute. */
  if (isPermanent(campaign.format)) return 0;
  return Math.max(0, Math.round(VIDEO_PER_MINUTE * (Number(play.seconds) / 60) * 100));
}

/* A week worth less than a dollar is carried rather than invoiced. Raising a
   numbered invoice for forty cents costs the advertiser a bank transfer fee
   and us the paper; it keeps until it is worth asking for. */
const MIN_CHARGE_CENTS = 100;

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
       campaign has since been stopped, not whether it has been paid for:
       gating on a payment status here would mean every unpaid week delivered
       for free, and an unpaid invoice is a conversation, not a kill switch. */
    if (!campaign || !shop || campaign.status === 'paused' || campaign.status === 'ended') continue;
    const amountCents = lineAmount(play, campaign);
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
    const { data: existing } = await db.from('charges').select('id, status, attempts').eq('billing_run_id', run.id).eq('advertiser_id', advertiserId).maybeSingle();
    /* Money already collected, or in flight, is left alone. A charge that
       failed is asked again: the card may have been fixed since, and without
       this the week it covered is never collected by a re-run. */
    if (existing && existing.status !== 'failed') continue;

    const attempt = (existing?.attempts ?? 0) + 1;
    let charge: { id: string } | null = existing ? { id: existing.id } : null;
    if (existing) {
      await db.from('charges').update({ status: 'pending', amount_cents: amountCents, attempts: attempt }).eq('id', existing.id);
      await db.from('charge_lines').delete().eq('charge_id', existing.id);
    } else {
      const { data: created, error: chargeError } = await db.from('charges').insert({ billing_run_id: run.id, advertiser_id: advertiserId, amount_cents: amountCents, attempts: attempt }).select('id').single();
      if (chargeError || !created) throw new Error(chargeError?.message ?? 'Could not write charge');
      charge = created;
    }
    if (!charge) continue;
    await db.from('charge_lines').insert([...lines.values()].map((line) => ({ charge_id: charge.id, campaign_id: line.campaignId, shop_id: line.shopId, amount_cents: line.amountCents, payout_cents: line.payoutCents })));
    /* Claim the plays before raising the invoice, so a run that dies midway
       cannot bill the same minute twice. */
    await markPlaysBilled(tally.playIds, charge.id);

    /* One line per campaign, named, because "$41.20" with no breakdown is a
       number an advertiser has to write in to understand. */
    const invoiceLines: InvoiceLine[] = [...lines.values()]
      .reduce((rows, line) => {
        const name = campaignById.get(line.campaignId)?.name ?? 'Video';
        const found = rows.find((row) => row.description === name);
        if (found) found.amountCents += line.amountCents;
        else rows.push({ description: name, amountCents: line.amountCents });
        return rows;
      }, [] as InvoiceLine[])
      .sort((a, b) => b.amountCents - a.amountCents);

    try {
      await invoiceCharge(
        charge.id,
        advertiserId,
        invoiceLines,
        `Video shown between ${bounds.startDate} and ${bounds.endDate}.`,
      );
      charged += 1;
    } catch (failure) {
      /* The ledger stands and the plays stay claimed; only the paper failed.
         Leaving the charge pending means the next run finds it and tries the
         invoice again rather than billing the same minutes twice. */
      console.error('could not raise invoice for charge', charge.id, failure);
    }
  }
  return { runId: run.id, charges: charged, carried };
}

async function markPlaysBilled(playIds: (number | string)[], chargeId: string) {
  const db = service();
  /* Postgres takes a large IN list badly, and a week of a busy wall is
     thousands of rows. */
  for (let at = 0; at < playIds.length; at += 500) {
    await db.from('plays').update({ charge_id: chargeId }).in('id', playIds.slice(at, at + 500));
  }
}

/* An invoice that goes unpaid is a conversation with a person, not an
   automatic pause: a bank transfer can be late for a dozen dull reasons and
   taking an advertiser off every screen over one is the wrong reflex. This
   voids the ledger row and hands its minutes back to the queue, and is called
   by hand when a week is genuinely written off. */
export async function voidCharge(chargeId: string) {
  const db = service();
  await db.from('charges').update({ status: 'failed' }).eq('id', chargeId);
  await db.from('invoices').update({ status: 'void' }).eq('charge_id', chargeId);
  /* Hand the plays back to the queue. Nothing was collected for them, so
     they belong in the next run rather than in a charge that was voided. */
  await db.from('plays').update({ charge_id: null }).eq('charge_id', chargeId);
}

/* What a shop is owed, and telling them it is coming, both live in
   lib/server/invoices.ts now: `queuePayouts` writes the payout rows and mails
   the remittance advice, and `markPayoutSent` closes one when the transfer
   has actually left the bank. Nothing pushes money from here. */
export { queuePayouts, markChargePaid, markPayoutSent } from './invoices.js';
