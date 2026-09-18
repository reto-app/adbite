'use client';

import { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import type { AccountKind } from '@/lib/account';
import {
  EMPTY_BUSINESS,
  EMPTY_SHOP_DETAIL,
  checkBusiness,
  saveOnboarding,
  type Business,
  type ShopDetail,
} from '@/lib/onboarding';
import { useCopy } from '@/lib/lang';
import { ONBOARDING } from '@/lib/copy/onboarding';

/* The one form between signing in and the dashboard.
 *
 * Both sides answer the same questions, because both sides are invoiced or
 * paid and an invoice needs a name and an address. A shop answers three more
 * about the screen, which is the half an advertiser is buying.
 *
 * Every label says what the answer is for. Asking a stranger for their postal
 * address before they have got anything out of the product is a big ask, and
 * "Business name — as it should appear on an invoice" is the difference
 * between a reasonable request and a suspicious one. */

export function BusinessForm({
  kind,
  initial,
  initialShop,
  onDone,
}: {
  kind: AccountKind;
  initial?: Business;
  initialShop?: ShopDetail;
  onDone: () => void;
}) {
  const t = useCopy(ONBOARDING);
  const [business, setBusiness] = useState<Business>(initial ?? EMPTY_BUSINESS);
  const [shop, setShop] = useState<ShopDetail>(initialShop ?? EMPTY_SHOP_DETAIL);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const head = kind === 'shop' ? t.shop : t.advertiser;
  const set = (patch: Partial<Business>) => setBusiness((was) => ({ ...was, ...patch }));

  return (
    <main className="campaign-page choose">
      <DashboardHeader />
      <section className="onboard wrap">
        <span className="eyebrow">{head.eyebrow}</span>
        <h1>{head.title}</h1>
        <p className="onboard-lede">{head.lede}</p>

        <form
          className="onboard-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const found = checkBusiness(business);
            setProblems(found.map((problem) => problem.message));
            if (found.length) return;
            setSaving(true);
            setError('');
            const result = await saveOnboarding(kind, business, shop);
            setSaving(false);
            if (result.ok) onDone();
            else setError(result.message);
          }}
        >
          <fieldset>
            <legend>{t.business.legend}</legend>
            <label className="shop-field">
              {t.business.name}
              <input
                value={business.businessName}
                required
                autoComplete="organization"
                placeholder={t.business.namePlaceholder}
                onChange={(event) => set({ businessName: event.target.value })}
              />
              <i>{t.business.nameHint}</i>
            </label>
            <label className="shop-field">
              {t.business.contact}
              <input
                value={business.contactName}
                required
                autoComplete="name"
                placeholder={t.business.contactPlaceholder}
                onChange={(event) => set({ contactName: event.target.value })}
              />
            </label>
            <div className="onboard-row">
              <label className="shop-field">
                {t.business.website}
                <input
                  value={business.website}
                  inputMode="url"
                  autoComplete="url"
                  placeholder={t.business.websitePlaceholder}
                  onChange={(event) => set({ website: event.target.value })}
                />
                <i>{t.business.websiteOptional}</i>
              </label>
              <label className="shop-field">
                {t.business.phone}
                <input
                  value={business.phone}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t.business.phonePlaceholder}
                  onChange={(event) => set({ phone: event.target.value })}
                />
                <i>{t.business.phoneOptional}</i>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>{t.where.legend}</legend>
            <label className="shop-field">
              {t.where.line1}
              <input
                value={business.addressLine1}
                required
                autoComplete="address-line1"
                placeholder={t.where.line1Placeholder}
                onChange={(event) => set({ addressLine1: event.target.value })}
              />
            </label>
            <label className="shop-field">
              {t.where.line2}
              <input
                value={business.addressLine2}
                autoComplete="address-line2"
                onChange={(event) => set({ addressLine2: event.target.value })}
              />
              <i>{t.where.line2Optional}</i>
            </label>
            <div className="onboard-row three">
              <label className="shop-field">
                {t.where.city}
                <input
                  value={business.city}
                  required
                  autoComplete="address-level2"
                  placeholder={t.where.cityPlaceholder}
                  onChange={(event) => set({ city: event.target.value })}
                />
              </label>
              <label className="shop-field">
                {t.where.region}
                <input
                  value={business.region}
                  required
                  autoComplete="address-level1"
                  placeholder={t.where.regionPlaceholder}
                  onChange={(event) => set({ region: event.target.value })}
                />
              </label>
              <label className="shop-field">
                {t.where.postal}
                <input
                  value={business.postalCode}
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder={t.where.postalPlaceholder}
                  onChange={(event) => set({ postalCode: event.target.value })}
                />
              </label>
            </div>
          </fieldset>

          {/* Only a shop has a screen to describe. */}
          {kind === 'shop' && (
            <fieldset>
              <legend>{t.screen.legend}</legend>
              <label className="shop-field">
                {t.screen.kind}
                <input
                  value={shop.kind}
                  placeholder={t.screen.kindPlaceholder}
                  onChange={(event) => setShop({ ...shop, kind: event.target.value })}
                />
                <i>{t.screen.kindHint}</i>
              </label>
              <div className="onboard-row">
                <label className="shop-field">
                  {t.screen.screens}
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={shop.screens}
                    onChange={(event) =>
                      setShop({ ...shop, screens: Number(event.target.value) || 1 })
                    }
                  />
                </label>
                <label className="shop-field">
                  {t.screen.daysOpen}
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={shop.daysOpen}
                    onChange={(event) =>
                      setShop({ ...shop, daysOpen: Number(event.target.value) || 7 })
                    }
                  />
                </label>
              </div>
            </fieldset>
          )}

          {kind === 'shop' && (
            <p className="onboard-note">
              <Info size={15} /> {t.notPlaced}
            </p>
          )}

          {problems.length > 0 && (
            <div className="form-warn" role="alert">
              <b>{t.problems}</b>
              <ul>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <p className="form-warn" role="alert">
              {error}
            </p>
          )}

          <button className="button primary" type="submit" disabled={saving}>
            {saving ? t.saving : t.submit} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
