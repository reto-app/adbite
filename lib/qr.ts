/* Every QR code AdBite has put on paper.
 *
 * A code is printed once and then lives in the world for as long as the paper
 * does, so what it opens is looked up here at scan time rather than baked into
 * the picture. Retargeting a code that is already out there is an edit to
 * this table; retiring one is deleting its row, and it then falls through to
 * the front page instead of a dead end.
 *
 * Imports nothing, so the api/ functions can read it without the `@/` alias. */

export type QrCode = {
  /** What the stats page calls it. */
  label: string;
  /** Where a scan lands, as a path on this site. */
  to: string;
  /** Carried to the landing page as utm_campaign, so Vercel Analytics can
      split its page views from everybody else's. */
  campaign: string;
};

export const QR_CODES: Record<string, QrCode> = {
  dj: {
    label: 'Don Joaquín Provo ad',
    to: '/don-joaquin',
    campaign: 'dj-provo',
  },
};

export function qrTarget(code: QrCode) {
  const query = new URLSearchParams({ utm_source: 'qr', utm_medium: 'print', utm_campaign: code.campaign });
  return `${code.to}?${query}`;
}
