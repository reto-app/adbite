/* Server-side delivery through Resend. Never imported by the browser.
 *
 * Without a key this logs and returns false rather than throwing: a missing
 * mail must never turn into a failed booking or a failed approval. SETUP.md
 * lists the variables. */

import { html, text, type Mail } from './layout.js';

const FROM = process.env.MAIL_FROM ?? 'AdBite <hello@adbite.site>';
const REPLY_TO = process.env.MAIL_REPLY_TO ?? 'support@adbite.site';

export async function send(to: string | string[], mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('mail not sent, RESEND_API_KEY unset:', mail.subject, '->', to);
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      reply_to: REPLY_TO,
      subject: mail.subject,
      html: html(mail),
      text: text(mail),
    }),
  });
  if (!response.ok) {
    console.error('resend refused', response.status, await response.text());
    return false;
  }
  return true;
}
