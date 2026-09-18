'use client';

import { useState } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { AdvertiserDashboard } from '@/app/dashboard/advertiser-dashboard';
import { ShopDashboard } from '@/app/dashboard/shop-dashboard';
import { ACCOUNTS, setAccount, signIn, useAccount } from '@/lib/account';
import { BusinessForm } from '@/components/onboarding/business-form';
import { useOnboarding } from '@/lib/onboarding';
import { SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* The door. An email address and a link in the mail; no password. */
function SignInPanel() {
  const t = useCopy(SHARED);
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (sent) {
    return (
      <section className="choose-side wrap">
        <span className="access-tick">
          <Check size={22} />
        </span>
        <h1>{t.door.checkMail}</h1>
        <p>{t.door.sentTo(sent)}</p>
      </section>
    );
  }

  return (
    <section className="choose-side wrap">
      <h1>{t.door.title}</h1>
      <p>{t.door.lede}</p>
      <form
        className="access-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const email = String(data.get('email') ?? '').trim();
          setSending(true);
          setError('');
          const result = await signIn(email);
          setSending(false);
          if (result.ok) setSent(email);
          else setError(result.message);
        }}
      >
        <label htmlFor="signin-email">
          {t.door.email}
          <input
            id="signin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.door.emailPlaceholder}
          />
        </label>
        <button className="button primary" type="submit" disabled={sending}>
          {sending ? t.form.sending : t.door.send} <ArrowRight size={17} />
        </button>
        {error && (
          <p className="form-warn" role="alert">
            {error} <a href={SUPPORT_MAILTO}>{t.form.emailSupportInstead}</a>.
          </p>
        )}
        <p className="form-note quiet">
          <Mail size={14} /> {t.door.trouble} <a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a>.
        </p>
      </form>
    </section>
  );
}

/* /dashboard is both workspaces.
 *
 * One account can stand on either side of the board, and the side is
 * switchable from inside either one. The two halves of the product genuinely
 * are one product: the ad a shop approves here is the ad an advertiser built
 * on the other side, and the share the shop sets is the inventory the
 * advertiser is buying. */
export function DashboardPage() {
  const { ready, kind, user } = useAccount();
  const onboarding = useOnboarding(kind);
  /* Bumped when the form saves, so the next render reads the fresh row rather
     than the one the hook loaded before there was anything in it. */
  const [saved, setSaved] = useState(false);
  const t = useCopy(SHARED);

  if (!ready) {
    return (
      <main className="campaign-page">
        <DashboardHeader />
        <div className="campaign-loading" aria-hidden="true" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="campaign-page choose">
        <DashboardHeader />
        <SignInPanel />
      </main>
    );
  }

  if (kind) {
    /* Wait for the row rather than flashing the form at somebody who answered
       these questions months ago. */
    if (!onboarding.ready) {
      return (
        <main className="campaign-page">
          <DashboardHeader />
          <div className="campaign-loading" aria-hidden="true" />
        </main>
      );
    }
    /* A hard gate. An invoice is addressed to a legal name at an address, and
       a form you can skip at signup is a form nobody fills in. */
    if (!onboarding.onboardedAt && !saved) {
      return (
        <BusinessForm
          kind={kind}
          initial={onboarding.business}
          initialShop={onboarding.shop}
          onDone={() => setSaved(true)}
        />
      );
    }
  }

  if (kind === 'shop') return <ShopDashboard />;
  if (kind === 'advertiser') return <AdvertiserDashboard />;

  return (
    <main className="campaign-page choose">
      <DashboardHeader />
      <section className="choose-side wrap">
        <h1>{t.choose.title}</h1>
        <p>{t.choose.lede(user.email)}</p>
        <div className="choose-grid">
          {ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              className="choose-card"
              data-track={`choose-${account.id}`}
              onClick={() => void setAccount(account.id)}
            >
              <b>{t.accounts[account.id].label}</b>
              <span>{t.accounts[account.id].blurb}</span>
              <i>
                {t.accounts[account.id].action} <ArrowRight size={15} />
              </i>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
