/* The endpoint the two waitlist forms and the campaign builder post to.
 *
 * It deliberately fails loudly. If no delivery route is configured it answers
 * 503 with a message the form shows the visitor, because a lead that silently
 * evaporates is worse than one that never got sent: the visitor believes they
 * are on a list and nobody finds out otherwise.
 *
 * Configure ONE of these in the Vercel project:
 *
 *   LEAD_WEBHOOK_URL   any endpoint that accepts a JSON POST. A Slack or
 *                      Discord incoming webhook, a Zapier or Make hook, or a
 *                      Google Sheet via Apps Script all work.
 *   RESEND_API_KEY     plus LEAD_FROM, to receive leads as mail. LEAD_TO
 *                      defaults to info@adbite.site. */

export const config = { runtime: 'nodejs' };

type Lead = {
  kind?: string;
  email?: string;
  page?: string;
  detail?: Record<string, unknown>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(lead: Lead) {
  const rows = Object.entries(lead.detail ?? {})
    .map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('\n');
  return [
    `New ${lead.kind ?? 'unknown'} lead from ${lead.page ?? 'the site'}`,
    `  email: ${lead.email}`,
    rows,
  ]
    .filter(Boolean)
    .join('\n');
}

/* A named method export: Vercel's Node runtime drops the return value of a
   default export, which is why this endpoint answered nothing for months. */
export async function POST(request: Request): Promise<Response> {

  let lead: Lead;
  try {
    lead = (await request.json()) as Lead;
  } catch {
    return json(400, { message: 'That request was not readable. Please try again.' });
  }

  const email = (lead.email ?? '').trim();
  if (!EMAIL.test(email)) {
    return json(400, { message: 'That email address does not look right. Check it and resend.' });
  }

  const body = text({ ...lead, email });
  const webhook = process.env.LEAD_WEBHOOK_URL;
  const resend = process.env.RESEND_API_KEY;

  try {
    if (webhook) {
      const sent = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: body, lead: { ...lead, email } }),
      });
      if (!sent.ok) throw new Error(`webhook ${sent.status}`);
      return json(200, { ok: true });
    }

    if (resend && process.env.LEAD_FROM) {
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${resend}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.LEAD_FROM,
          to: process.env.LEAD_TO ?? 'info@adbite.site',
          reply_to: email,
          subject: `AdBite: new ${lead.kind ?? ''} lead`,
          text: body,
        }),
      });
      if (!sent.ok) throw new Error(`resend ${sent.status}`);
      return json(200, { ok: true });
    }
  } catch (error) {
    console.error('lead delivery failed', error);
    return json(502, {
      message: 'We could not file that just now. Please email info@adbite.site instead.',
    });
  }

  console.error('lead received but no delivery route configured', body);
  return json(503, {
    message: 'Our signup is not accepting entries right now. Please email info@adbite.site.',
  });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
