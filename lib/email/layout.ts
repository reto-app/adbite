/* The one frame every AdBite mail is set in.
 *
 * Mail clients are the 2009 web: tables, inline styles, no SVG, no web
 * fonts. So the brand is carried by three things they all honour: the black
 * plate with the wordmark and bite as a hosted PNG, a system sans, and the
 * sky-blue button. Every template below hands this a title, a few blocks and
 * an optional button, and gets back HTML and a plain-text twin.
 *
 * Shared by the api/ functions (through Resend) and by the script that pushes
 * the sign-in template into Supabase Auth, which is why nothing here touches
 * React or the browser. */

import { ORIGIN, SUPPORT_MAIL } from '../site.js';

export const INK = '#0d0d0d';
export const SKY = '#8fd0f6';
export const PAPER = '#ffffff';
export const GROUND = '#f2f4f6';
export const MUTED = '#6b7480';

export const HEADER_IMAGE = `${ORIGIN}/brand/email-header.png`;

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'lead'; text: string }
  | { kind: 'rows'; rows: [string, string][] }
  | { kind: 'quiet'; text: string };

export type Mail = {
  subject: string;
  /** Short line clients show beside the subject in the inbox. */
  preview: string;
  title: string;
  blocks: Block[];
  button?: { label: string; href: string };
  /** Why the recipient is getting this. Always present, always honest. */
  reason: string;
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escape(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function block(item: Block): string {
  switch (item.kind) {
    case 'lead':
      return `<p style="margin:0 0 18px;font-size:18px;line-height:1.5;color:${INK};">${escape(item.text)}</p>`;
    case 'p':
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK};">${escape(item.text)}</p>`;
    case 'quiet':
      return `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${MUTED};">${escape(item.text)}</p>`;
    case 'rows':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;border-top:1px solid #e3e7eb;">${item.rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #e3e7eb;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED};width:38%;">${escape(label)}</td><td style="padding:10px 0;border-bottom:1px solid #e3e7eb;font-size:16px;color:${INK};">${escape(value)}</td></tr>`,
        )
        .join('')}</table>`;
  }
}

/** `raw` lets a template pass a link the mailer substitutes (Supabase's
    {{ .ConfirmationURL }}), which must not be escaped. */
export function html(mail: Mail, raw?: { buttonHref?: string }): string {
  const href = raw?.buttonHref ?? (mail.button ? escape(mail.button.href) : '');
  const button = mail.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${SKY};border-radius:6px;"><a href="${href}" style="display:inline-block;padding:14px 22px;font-family:${FONT};font-size:16px;font-weight:700;color:${INK};text-decoration:none;">${escape(mail.button.label)}</a></td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="light">
<title>${escape(mail.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(mail.preview)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
  <tr><td style="background:${INK};border-radius:8px 8px 0 0;">
    <a href="${ORIGIN}" style="display:block;"><img src="${HEADER_IMAGE}" width="600" height="150" alt="AdBite" style="display:block;width:100%;height:auto;border:0;border-radius:8px 8px 0 0;"></a>
  </td></tr>
  <tr><td style="background:${PAPER};padding:36px 40px 28px;">
    <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-.01em;color:${INK};">${escape(mail.title)}</h1>
    ${mail.blocks.map(block).join('\n    ')}
    ${button}
  </td></tr>
  <tr><td style="background:${PAPER};border-top:1px solid #e3e7eb;border-radius:0 0 8px 8px;padding:20px 40px 26px;">
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${MUTED};">${escape(mail.reason)}</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED};">Questions go to <a href="mailto:${SUPPORT_MAIL}" style="color:${INK};">${SUPPORT_MAIL}</a>. A person reads it.</p>
  </td></tr>
  <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.5;color:${MUTED};text-align:center;">AdBite · Local ads on screens people already watch · <a href="${ORIGIN}" style="color:${MUTED};">adbite.site</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function text(mail: Mail, raw?: { buttonHref?: string }): string {
  const lines: string[] = [mail.title, ''];
  for (const item of mail.blocks) {
    if (item.kind === 'rows') {
      for (const [label, value] of item.rows) lines.push(`${label}: ${value}`);
      lines.push('');
    } else {
      lines.push(item.text, '');
    }
  }
  if (mail.button) lines.push(`${mail.button.label}: ${raw?.buttonHref ?? mail.button.href}`, '');
  lines.push(mail.reason, `Questions: ${SUPPORT_MAIL}`, '', `AdBite · ${ORIGIN}`);
  return lines.join('\n');
}
