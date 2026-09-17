import { billPreviousWeek } from '../../lib/server/billing.js';

export const config = { runtime: 'nodejs' };

/** Vercel Cron calls this every Monday: it tallies the video that ran, writes
    the ledger, and raises an invoice per advertiser payable by bank transfer.
    Nothing is collected here. It can also be invoked manually with the same
    bearer secret to reconcile a missed run. */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  try {
    return Response.json(await billPreviousWeek());
  } catch (error) {
    console.error('weekly billing failed', error instanceof Error ? error.message : 'unknown error');
    return new Response('Billing failed', { status: 500 });
  }
}
