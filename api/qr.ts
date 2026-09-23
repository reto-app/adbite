/* A scan of a printed QR code.
 *
 *   GET /q/dj  (rewritten here by vercel.json as /api/qr?c=dj)
 *   -> 302 to the page the code is for, after writing one qr_scans row
 *
 * The redirect never waits on the database for longer than it has to and
 * never fails because of it: somebody holding a phone up to a poster should
 * reach the page whether or not the count went in. A code nobody recognises
 * goes to the front page rather than a 404, because the paper is already out
 * there and the person scanning it did nothing wrong.
 *
 * See supabase/migrations/0023_qr_scans.sql for what is and is not kept. */

import { service, sha256 } from '../lib/server/db.js';
import { QR_CODES, qrTarget } from '../lib/qr.js';

export const config = { runtime: 'nodejs' };

/* Link unfurlers, crawlers and scripts. A code pasted into iMessage or Slack
   is fetched by the preview bot before anybody taps it, which would otherwise
   read as a scan. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|telegram|discord|slack|skype|linkedin|embedly|quora|pinterest|vkshare|curl|wget|python|node-fetch|axios|go-http|headless|lighthouse/i;

function deviceOf(agent: string) {
  if (/iphone|ipad|ipod/i.test(agent)) return 'ios';
  if (/android/i.test(agent)) return 'android';
  return 'other';
}

function header(request: Request, name: string) {
  const value = request.headers.get(name);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function record(request: Request, code: string) {
  const agent = request.headers.get('user-agent') ?? '';
  const address = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  /* Mountain time, so a phone's hash turns over when the stats page's day does. */
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date());
  await service()
    .from('qr_scans')
    .insert({
      code,
      visitor: sha256(`${address}|${agent}|${day}`).slice(0, 32),
      bot: request.method !== 'GET' || !agent || BOT.test(agent),
      device: deviceOf(agent),
      city: header(request, 'x-vercel-ip-city'),
      region: header(request, 'x-vercel-ip-country-region'),
    });
}

async function handle(request: Request): Promise<Response> {
  const code = (new URL(request.url).searchParams.get('c') ?? '').toLowerCase();
  const known = QR_CODES[code];

  if (known) {
    try {
      await record(request, code);
    } catch (failure) {
      console.error('qr scan not recorded', code, failure);
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: known ? qrTarget(known) : '/',
      /* Every scan has to reach this function to be counted. */
      'cache-control': 'no-store',
    },
  });
}

export const GET = handle;
export const HEAD = handle;
