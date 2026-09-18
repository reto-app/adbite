'use client';

/* The questions both sides answer once, on the way in.
 *
 * An account used to be an email address and a role. That was enough while
 * Stripe held the customer record; it stopped being enough the moment we
 * started raising invoices ourselves, because an invoice is addressed to a
 * legal name at a postal address and we had neither.
 *
 * Both sides answer the same short set — who you are, where you are, how to
 * reach you — because both sides get invoiced or paid. A shop answers a few
 * more about the screen itself, which is the half an advertiser is buying.
 *
 * `needsOnboarding` gates the dashboard. It is deliberately a hard gate: a
 * skippable form at signup is a form nobody fills in, and then every invoice
 * we raise for the next year is addressed to an email address. */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AccountKind } from '@/lib/account';

export type Business = {
  businessName: string;
  contactName: string;
  website: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

/** The extra half, for a shop: what the screen is and how the room runs. */
export type ShopDetail = {
  kind: string;
  screens: number;
  daysOpen: number;
};

export const EMPTY_BUSINESS: Business = {
  businessName: '',
  contactName: '',
  website: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'US',
};

export const EMPTY_SHOP_DETAIL: ShopDetail = { kind: '', screens: 1, daysOpen: 7 };

/* ---- what we insist on --------------------------------------------------
   Short. Every field here is one we cannot raise an invoice or place a board
   without, and nothing else is required: a shop that has no website should
   not be stuck at a form over it. */

export type Problem = { field: keyof Business | keyof ShopDetail; message: string };

const NEEDED: { field: keyof Business; label: string }[] = [
  { field: 'businessName', label: 'the business name' },
  { field: 'contactName', label: 'who we should ask for' },
  { field: 'addressLine1', label: 'a street address' },
  { field: 'city', label: 'a city' },
  { field: 'region', label: 'a state' },
  { field: 'postalCode', label: 'a postcode' },
];

export function checkBusiness(business: Business): Problem[] {
  const problems: Problem[] = [];
  for (const { field, label } of NEEDED) {
    if (!business[field].trim()) problems.push({ field, message: `We need ${label}.` });
  }
  const site = business.website.trim();
  /* A bare domain is what people type, so accept it and tidy it on save
     rather than rejecting them over a missing https://. */
  if (site && !/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(site.replace(/^https?:\/\//i, ''))) {
    problems.push({ field: 'website', message: 'That does not look like a web address.' });
  }
  const phone = business.phone.replace(/\D/g, '');
  if (phone && (phone.length < 10 || phone.length > 15)) {
    problems.push({ field: 'phone', message: 'That does not look like a phone number.' });
  }
  return problems;
}

/** "adbite.site" and "https://adbite.site/" both land here the same way. */
export function tidyWebsite(site: string) {
  const trimmed = site.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/* ---- reading and writing ------------------------------------------------ */

/* Every column read here is text or null, which String() would coerce
   correctly anyway but the type should say so. */
type Row = Record<string, string | null>;

function businessFromRow(row: Row | null): Business {
  if (!row) return EMPTY_BUSINESS;
  const text = (key: string) => row[key] ?? '';
  return {
    businessName: text('business_name'),
    contactName: text('contact_name'),
    website: text('website'),
    phone: text('phone'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    region: text('region'),
    postalCode: text('postal_code'),
    country: text('country') || 'US',
  };
}

export type OnboardingState = {
  ready: boolean;
  /** Null until the questions are answered. */
  onboardedAt: string | null;
  business: Business;
  shop: ShopDetail;
  /** Whether this shop has been placed on the network yet. */
  placed: boolean;
};

export function useOnboarding(kind: AccountKind | null): OnboardingState {
  const [state, setState] = useState<OnboardingState>({
    ready: false,
    onboardedAt: null,
    business: EMPTY_BUSINESS,
    shop: EMPTY_SHOP_DETAIL,
    placed: false,
  });

  useEffect(() => {
    if (!kind) return;
    let live = true;

    void (async () => {
      const db = supabase();
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) return;

      const { data: account } = await db
        .from('accounts')
        .select(
          'business_name, contact_name, website, phone, address_line1, address_line2, city, region, postal_code, country, onboarded_at',
        )
        .eq('id', auth.user.id)
        .maybeSingle();

      let shop = EMPTY_SHOP_DETAIL;
      let placed = false;
      if (kind === 'shop') {
        const { data: row } = await db
          .from('shops')
          .select('kind, screens, days_open, venue_id')
          .eq('owner_id', auth.user.id)
          .limit(1)
          .maybeSingle();
        if (row) {
          shop = {
            kind: String(row.kind ?? ''),
            screens: Number(row.screens ?? 1),
            daysOpen: Number(row.days_open ?? 7),
          };
          placed = Boolean(row.venue_id);
        }
      }

      if (!live) return;
      setState({
        ready: true,
        onboardedAt: (account?.onboarded_at as string | null) ?? null,
        business: businessFromRow(account as Row | null),
        shop,
        placed,
      });
    })();

    return () => {
      live = false;
    };
  }, [kind]);

  return state;
}

export async function saveOnboarding(
  kind: AccountKind,
  business: Business,
  shop: ShopDetail,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Sign in first.' };

  const { error } = await db
    .from('accounts')
    .update({
      business_name: business.businessName.trim(),
      contact_name: business.contactName.trim(),
      website: tidyWebsite(business.website),
      phone: business.phone.trim(),
      address_line1: business.addressLine1.trim(),
      address_line2: business.addressLine2.trim(),
      city: business.city.trim(),
      region: business.region.trim(),
      postal_code: business.postalCode.trim(),
      country: business.country.trim() || 'US',
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', auth.user.id);
  if (error) return { ok: false, message: error.message };

  if (kind === 'shop') {
    /* The shop row is named after the business now. It used to be seeded from
       the starter board, which is why the first real shop that ever signed up
       was called Bao Pao Wow. */
    const address = [business.addressLine1, business.addressLine2, business.city, business.region, business.postalCode]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');

    const { error: shopError } = await db
      .from('shops')
      .update({
        name: business.businessName.trim(),
        address,
        website: tidyWebsite(business.website),
        phone: business.phone.trim(),
        kind: shop.kind.trim(),
        screens: Math.max(1, shop.screens),
        days_open: Math.min(7, Math.max(1, shop.daysOpen)),
      })
      .eq('owner_id', auth.user.id);
    if (shopError) return { ok: false, message: shopError.message };
  }

  return { ok: true };
}
