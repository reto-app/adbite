'use client';

/* Sending a lead somewhere a person will actually see it.
 *
 * Both waitlist forms used to call preventDefault, set a "you're on the list"
 * flag, and discard everything: no endpoint, no storage, and no email field to
 * reply to even if there had been. Every submission since the site went up is
 * gone. This posts to /api/lead and, crucially, tells the visitor when it did
 * not work instead of showing them a success state that is a lie. */

import { MAIL } from '@/lib/site';
import type { Lang } from '@/lib/lang';

export type LeadKind = 'shop' | 'advertiser' | 'campaign';

export type Lead = {
  kind: LeadKind;
  email: string;
  /** The language the form was read in, so the reply and any error come
      back in it. Optional so the campaign builder's older call sites hold. */
  lang?: Lang;
  /** Whatever the specific form collected. Shapes differ per form. */
  detail: Record<string, unknown>;
};

export type LeadResult = { ok: true } | { ok: false; message: string };

/** FormData holds `string | File`; only the text ones mean anything here. */
export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

const FALLBACK: Record<Lang, string> = {
  en: `We could not send that just now. Please email ${MAIL} and we will pick it up from there.`,
  es: `No pudimos enviar eso ahora mismo. Escríbenos a ${MAIL} y lo seguimos desde ahí.`,
};

export async function submitLead(lead: Lead): Promise<LeadResult> {
  const fallback = FALLBACK[lead.lang ?? 'en'];
  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...lead, page: window.location.pathname }),
    });

    if (response.ok) return { ok: true };

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: body?.message ?? fallback };
  } catch {
    return { ok: false, message: fallback };
  }
}

/** A prefilled mail link, so a failed submit still has somewhere to go. */
export function mailFallback(lead: Lead) {
  const lines = Object.entries(lead.detail)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('\n');
  const subject =
    lead.lang === 'es'
      ? lead.kind === 'shop' ? 'Lista de espera para negocios' : 'Consulta de anunciante'
      : lead.kind === 'shop' ? 'Shop waitlist' : 'Advertiser enquiry';
  return `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
}
