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
 *   GET /q/dj/stats?key=…  (rewritten here as /api/qr?c=dj&stats=1)
 *   -> a small HTML page: scans, distinct phones, today, and a day-by-day list
 *
 * Both live in one function because the Hobby plan allows twelve per
 * deployment and the site was already at eleven.
 *
 * The stats page is a page rather than JSON because the person asking is
 * holding a phone, and it is meant to be bookmarked. The key is QR_STATS_KEY,
 * one secret for every code; without it set, the page answers 404 like any
 * other path that is not there. Days are Mountain time, because that is where
 * the paper is.
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
  if (new URL(request.url).searchParams.get('stats') === '1') return stats(request);
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

type Scan = { scanned_at: string; visitor: string; bot: boolean; device: string; city: string | null };

const ZONE = 'America/Denver';
const dayOf = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const clock = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function scansFor(code: string) {
  const db = service();
  const rows: Scan[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('qr_scans')
      .select('scanned_at, visitor, bot, device, city')
      .eq('code', code)
      .order('scanned_at', { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Scan[]));
    if (!data || data.length < 1000) return rows;
  }
}

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escape(title)}</title>
<style>
:root{--ink:#0b0b0c;--ash:#6b6b70;--line:#e6e6e8;--paper:#f6f6f4;--card:#fff;--sky:#3aa8ff}
@media (prefers-color-scheme:dark){:root{--ink:#f2f2f2;--ash:#9a9aa0;--line:#2a2a2e;--paper:#0b0b0c;--card:#141416}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 system-ui,-apple-system,sans-serif}
main{max-width:560px;margin:0 auto;padding:28px 16px 56px}
h1{font-size:22px;margin:0 0 4px;letter-spacing:-.02em}p{margin:0;color:var(--ash);font-size:13px}
.big{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0}
.big div{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.big b{display:block;font-size:30px;letter-spacing:-.03em;color:var(--sky);font-variant-numeric:tabular-nums}
.big span{font-size:12.5px;color:var(--ash)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:13.5px}
th,td{padding:9px 14px;text-align:left;border-bottom:1px solid var(--line)}th{font-weight:600;color:var(--ash);font-size:12px}
td.n{text-align:right;font-variant-numeric:tabular-nums}tr:last-child td{border-bottom:0}
.bar{display:inline-block;height:8px;border-radius:4px;background:var(--sky);vertical-align:middle;margin-right:8px}
h2{font-size:14px;margin:26px 0 8px}
</style></head><body><main>${body}</main></body></html>`;
}

function html(status: number, body: string) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function stats(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = (url.searchParams.get('c') ?? '').toLowerCase();
  const key = process.env.QR_STATS_KEY;
  const known = QR_CODES[code];
  if (!key || !known || url.searchParams.get('key') !== key) return html(404, page('Not found', '<h1>Not found</h1>'));

  let all: Scan[];
  try {
    all = await scansFor(code);
  } catch (failure) {
    return html(500, page('Unavailable', `<h1>Could not read the scans</h1><p>${escape(String(failure))}</p>`));
  }

  const people = all.filter((scan) => !scan.bot);
  const today = dayOf.format(new Date());
  const byDay = new Map<string, { scans: number; phones: Set<string> }>();
  for (const scan of people) {
    const day = dayOf.format(new Date(scan.scanned_at));
    const entry = byDay.get(day) ?? { scans: 0, phones: new Set<string>() };
    entry.scans += 1;
    entry.phones.add(scan.visitor);
    byDay.set(day, entry);
  }
  /* `visitor` rolls over at midnight, so a phone that scans on two days is
     two phones here. Across a whole campaign that overcounts slightly; within
     one day it is exact. */
  const phones = [...byDay.values()].reduce((sum, day) => sum + day.phones.size, 0);
  const ios = people.filter((scan) => scan.device === 'ios').length;
  const android = people.filter((scan) => scan.device === 'android').length;
  const peak = Math.max(1, ...[...byDay.values()].map((day) => day.scans));

  const days = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(
      ([day, entry]) =>
        `<tr><td>${escape(label.format(new Date(`${day}T12:00:00Z`)))}</td><td><span class="bar" style="width:${Math.round((entry.scans / peak) * 120)}px"></span></td><td class="n">${entry.scans}</td><td class="n">${entry.phones.size}</td></tr>`,
    )
    .join('');

  const recent = people
    .slice(0, 15)
    .map(
      (scan) =>
        `<tr><td>${escape(clock.format(new Date(scan.scanned_at)))}</td><td>${escape(scan.device === 'ios' ? 'iPhone' : scan.device === 'android' ? 'Android' : 'Other')}</td><td>${escape(scan.city ?? '')}</td></tr>`,
    )
    .join('');

  const body = `
<h1>${escape(known.label)}</h1>
<p>adbite.site/q/${escape(code)} · ${all.length - people.length} link previews and bots left out</p>
<div class="big">
  <div><b>${people.length}</b><span>scans</span></div>
  <div><b>${phones}</b><span>different phones</span></div>
  <div><b>${byDay.get(today)?.scans ?? 0}</b><span>today</span></div>
  <div><b>${ios} / ${android}</b><span>iPhone / Android</span></div>
</div>
${
  people.length
    ? `<h2>By day</h2><table><tr><th>Day</th><th></th><th>Scans</th><th>Phones</th></tr>${days}</table>
<h2>Latest</h2><table><tr><th>When</th><th>Phone</th><th>City</th></tr>${recent}</table>`
    : '<p style="margin-top:8px">No scans yet.</p>'
}`;

  return html(200, page(`${known.label} · scans`, body));
}

export const GET = handle;
export const HEAD = handle;
