/* Invoices, receipts and remittance advice. Server-only.
 *
 * Stripe is shelved, so nothing collects itself. Money moves by bank transfer
 * in both directions and the product's job is to produce the paper that makes
 * that possible and auditable: a numbered invoice telling an advertiser what
 * to send and where, a receipt when it lands, and a remittance note telling a
 * shop what we have just pushed to them.
 *
 * The ledger underneath is unchanged. `charges`, `charge_lines` and `payouts`
 * were never Stripe-specific -- they are the accounting -- and an invoice
 * hangs off one of them rather than replacing it. What changed is that a
 * charge is no longer confirmed by a webhook a second later; it sits at
 * `pending` until somebody confirms the transfer arrived, which is what
 * `markChargePaid` below is for. */

import { service } from './db.js';
import { send } from '../email/send.js';
import { invoiceIssued, paymentReceived, remittanceSent } from '../email/templates.js';
import { BANK, bankConfigured } from './bank.js';

/** Days an advertiser has to send the transfer. */
export const NET_DAYS = 14;

export type InvoiceKind = 'charge' | 'payout';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/* ---- numbering -----------------------------------------------------------
   AB-2026-0001, counted within the year. Postgres would do this better with a
   sequence, but a sequence per year needs a migration every January; counting
   the year's rows is one query and the table is small. The unique index on
   `number` is what actually guarantees no two invoices share one: a racing
   second writer loses, and the caller retries. */

async function nextNumber(): Promise<string> {
  const db = service();
  const year = new Date().getUTCFullYear();
  const { count } = await db
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .gte('issued_at', `${year}-01-01T00:00:00Z`);
  return `AB-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

function dueDate(days = NET_DAYS) {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + days);
  return due.toISOString().slice(0, 10);
}

/** Write an invoice row, retrying once if the number was taken in between. */
async function insertInvoice(row: Record<string, unknown>) {
  const db = service();
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextNumber();
    const { data, error } = await db
      .from('invoices')
      .insert({ ...row, number, reference: number, due_on: dueDate() })
      .select('id, number, amount_cents, due_on')
      .single();
    if (!error && data) return data;
    /* 23505 is a unique violation: somebody took the number first. */
    if (error && error.code !== '23505') throw new Error(error.message);
  }
  throw new Error('Could not allocate an invoice number');
}

/* ---- what an advertiser owes -------------------------------------------- */

export type InvoiceLine = { description: string; amountCents: number };

/**
 * Raise an invoice against a charge and mail it.
 *
 * Idempotent on the charge: a billing run that is re-run does not invoice the
 * same week twice, because the first invoice is found and returned instead.
 */
export async function invoiceCharge(
  chargeId: string,
  advertiserId: string,
  lines: InvoiceLine[],
  note?: string,
) {
  const db = service();
  const { data: existing } = await db
    .from('invoices')
    .select('id, number, amount_cents, due_on, status')
    .eq('charge_id', chargeId)
    .maybeSingle();
  if (existing) return existing;

  const amountCents = lines.reduce((total, line) => total + line.amountCents, 0);
  const invoice = await insertInvoice({
    kind: 'charge',
    charge_id: chargeId,
    advertiser_id: advertiserId,
    amount_cents: amountCents,
    note: note ?? null,
  });

  const { data: account } = await db
    .from('accounts')
    .select('email, business_name, contact_name, address_line1, address_line2, city, region, postal_code')
    .eq('id', advertiserId)
    .maybeSingle();

  /* The name and address the advertiser gave at signup. Without them this is
     a demand for money addressed to an email address, which is not something
     a bookkeeper can act on. */
  const billTo = account
    ? [
        account.business_name,
        account.contact_name,
        account.address_line1,
        account.address_line2,
        [account.city, account.region, account.postal_code].filter(Boolean).join(' '),
      ]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
    : [];

  if (account?.email && bankConfigured()) {
    const sent = await send(
      account.email,
      invoiceIssued({
        number: invoice.number,
        amount: money(amountCents),
        dueOn: invoice.due_on as string,
        lines: lines.map((line) => [line.description, money(line.amountCents)] as [string, string]),
        bank: BANK,
        billTo,
        note,
      }),
    );
    if (sent) await db.from('invoices').update({ status: 'sent' }).eq('id', invoice.id);
  } else if (!bankConfigured()) {
    console.warn('invoice raised but not sent: bank details are not configured', invoice.number);
  }

  return invoice;
}

/**
 * Mark an invoice settled, move its charge with it, and send the receipt.
 *
 * This is the human step. A bank transfer is not confirmed by a webhook, so
 * somebody reconciles the statement and calls this with the invoice number
 * that appeared on the bank line.
 */
export async function markChargePaid(number: string, paidAt = new Date()) {
  const db = service();
  const { data: invoice } = await db
    .from('invoices')
    .select('id, kind, charge_id, advertiser_id, amount_cents, status')
    .eq('number', number)
    .maybeSingle();
  if (!invoice) throw new Error(`No invoice ${number}`);
  if (invoice.kind !== 'charge') throw new Error(`${number} is not an advertiser invoice`);
  if (invoice.status === 'paid') return invoice;

  const stamp = paidAt.toISOString();
  await db.from('invoices').update({ status: 'paid', paid_at: stamp }).eq('id', invoice.id);
  await db
    .from('charges')
    .update({ status: 'succeeded', paid_at: stamp })
    .eq('id', invoice.charge_id);

  /* The shops' shares become payable the moment the money is actually in,
     which with a transfer is now rather than two business days from now. */
  await queuePayouts(invoice.charge_id as string);

  const { data: account } = await db
    .from('accounts')
    .select('email')
    .eq('id', invoice.advertiser_id)
    .maybeSingle();
  if (account?.email) {
    await send(
      account.email,
      paymentReceived({
        number,
        amount: money(Number(invoice.amount_cents)),
        paidOn: stamp.slice(0, 10),
      }),
    );
  }
  return invoice;
}

/* ---- what we owe a shop -------------------------------------------------- */

/**
 * Turn a paid charge's recorded shop shares into payout rows and tell each
 * shop what is coming. The transfer itself is pushed from the bank; this is
 * the remittance advice that says what it is for.
 */
export async function queuePayouts(chargeId: string) {
  const db = service();
  const { data: lines } = await db
    .from('charge_lines')
    .select('shop_id, payout_cents')
    .eq('charge_id', chargeId);

  const byShop = new Map<string, number>();
  for (const line of lines ?? []) {
    byShop.set(line.shop_id, (byShop.get(line.shop_id) ?? 0) + Number(line.payout_cents));
  }
  if (!byShop.size) return;

  const { data: shops } = await db
    .from('shops')
    .select('id, name, owner_id')
    .in('id', [...byShop.keys()]);
  const { data: accounts } = await db
    .from('accounts')
    .select('id, email')
    .in('id', (shops ?? []).map((shop) => shop.owner_id));
  const emailByOwner = new Map((accounts ?? []).map((account) => [account.id, account.email]));

  /* A shop that has not told us where to send it still gets the row and the
     note; what it does not get is a transfer, and the note says so. */
  const { data: banks } = await db
    .from('payout_accounts')
    .select('shop_id, account_last4')
    .in('shop_id', [...byShop.keys()]);
  const bankByShop = new Map((banks ?? []).map((row) => [row.shop_id, row.account_last4]));

  for (const shop of shops ?? []) {
    const amountCents = byShop.get(shop.id) ?? 0;
    if (!amountCents) continue;

    const { data: existing } = await db
      .from('payouts')
      .select('id, status')
      .eq('charge_id', chargeId)
      .eq('shop_id', shop.id)
      .maybeSingle();
    if (existing && existing.status === 'paid') continue;

    const payout =
      existing ??
      (
        await db
          .from('payouts')
          .insert({ charge_id: chargeId, shop_id: shop.id, amount_cents: amountCents })
          .select('id')
          .single()
      ).data;
    if (!payout) continue;

    const { data: already } = await db
      .from('invoices')
      .select('id, number')
      .eq('payout_id', payout.id)
      .maybeSingle();
    const invoice =
      already ??
      (await insertInvoice({
        kind: 'payout',
        payout_id: payout.id,
        shop_id: shop.id,
        amount_cents: amountCents,
      }));

    const email = emailByOwner.get(shop.owner_id);
    if (email && !already) {
      await send(
        email,
        remittanceSent({
          number: invoice.number as string,
          shopName: shop.name ?? 'your shop',
          amount: money(amountCents),
          last4: bankByShop.get(shop.id) ?? null,
        }),
      );
    }
  }
}

/** Mark a payout actually sent, once the transfer has left the bank. */
export async function markPayoutSent(number: string, sentAt = new Date()) {
  const db = service();
  const { data: invoice } = await db
    .from('invoices')
    .select('id, kind, payout_id, status')
    .eq('number', number)
    .maybeSingle();
  if (!invoice) throw new Error(`No remittance ${number}`);
  if (invoice.kind !== 'payout') throw new Error(`${number} is not a payout`);
  if (invoice.status === 'paid') return invoice;
  const stamp = sentAt.toISOString();
  await db.from('invoices').update({ status: 'paid', paid_at: stamp }).eq('id', invoice.id);
  await db.from('payouts').update({ status: 'paid', paid_at: stamp }).eq('id', invoice.payout_id);
  return invoice;
}
