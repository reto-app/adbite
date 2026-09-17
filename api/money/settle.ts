import { markChargePaid, markPayoutSent } from '../../lib/server/invoices.js';

export const config = { runtime: 'nodejs' };

/* Reconciliation, by hand.
 *
 * A bank transfer does not announce itself the way a card charge does, so
 * somebody reads the statement and tells the product what landed. That is this
 * endpoint: give it an invoice number and it settles the ledger row behind it
 * and sends the receipt.
 *
 *   POST /api/money/settle   Authorization: Bearer $CRON_SECRET
 *   { "number": "AB-2026-0001" }               an advertiser paid us
 *   { "number": "AB-2026-0002", "kind": "payout" }   we paid a shop
 *
 * It is behind the same secret as the weekly run rather than a session,
 * because marking money received is not something any signed-in account
 * should be able to do -- including the account it would flatter.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { number?: string; kind?: string };
  try {
    body = (await request.json()) as { number?: string; kind?: string };
  } catch {
    return Response.json({ message: 'Unreadable request' }, { status: 400 });
  }

  const number = (body.number ?? '').trim();
  if (!number) return Response.json({ message: 'Give me an invoice number' }, { status: 400 });

  try {
    const settled =
      body.kind === 'payout' ? await markPayoutSent(number) : await markChargePaid(number);
    return Response.json({ ok: true, number, id: settled.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not settle that';
    console.error('settle failed', number, message);
    return Response.json({ message }, { status: 400 });
  }
}
