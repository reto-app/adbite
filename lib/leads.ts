'use client';

/* Sending a lead somewhere a person will actually see it.
 *
 * Both waitlist forms used to call preventDefault, set a "you're on the list"
 * flag, and discard everything: no endpoint, no storage, and no email field to
 * reply to even if there had been. Every submission since the site went up is
 * gone. This posts to /api/lead and, crucially, tells the visitor when it did
 * not work instead of showing them a success state that is a lie. */

import { MAIL } from '@/lib/site';

export type LeadKind = 'shop' | 'advertiser' | 'campaign';

export type Lead = {
  kind: LeadKind;
  email: string;
  /** Whatever the specific form collected. Shapes differ per form. */
  detail: Record<string, unknown>;
};

export type LeadResult = { ok: true } | { ok: false; message: string };

/** FormData holds `string | File`; only the text ones mean anything here. */
export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

const FALLBACK = `We could not send that just now. Please email ${MAIL} and we will pick it up from there.`;

export async function submitLead(lead: Lead): Promise<LeadResult> {
  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...lead, page: window.location.pathname }),
    });

    if (response.ok) return { ok: true };

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: body?.message ?? FALLBACK };
  } catch {
    return { ok: false, message: FALLBACK };
  }
}

/** A prefilled mail link, so a failed submit still has somewhere to go. */
export function mailFallback(lead: Lead) {
  const lines = Object.entries(lead.detail)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('\n');
  const subject = lead.kind === 'shop' ? 'Shop waitlist' : 'Advertiser enquiry';
  return `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
}
