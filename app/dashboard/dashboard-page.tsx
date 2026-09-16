'use client';

import { useState } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { AdvertiserDashboard } from '@/app/dashboard/advertiser-dashboard';
import { ShopDashboard } from '@/app/dashboard/shop-dashboard';
import { ACCOUNTS, setAccount, signIn, useAccount } from '@/lib/account';
import { SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';

const NAV = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
];

/* The door. An email address and a link in the mail; no password. */
function SignInPanel() {
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (sent) {
    return (
      <section className="choose-side wrap">
        <span className="access-tick">
          <Check size={22} />
        </span>
        <h1>Check your mail.</h1>
        <p>
          We sent a sign-in link to <b>{sent}</b>. Open it on this device and you land back here,
          signed in. The link is good for an hour.
        </p>
      </section>
    );
  }

  return (
    <section className="choose-side wrap">
      <h1>Sign in to your dashboard</h1>
      <p>
        Type the email you use for your business and we will send a link. No password to make up
        or forget.
      </p>
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
          Email
          <input
            id="signin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourbusiness.com"
          />
        </label>
        <button className="button primary" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send me a sign-in link'} <ArrowRight size={17} />
        </button>
        {error && (
          <p className="form-warn" role="alert">
            {error} <a href={SUPPORT_MAILTO}>Email support instead</a>.
          </p>
        )}
        <p className="form-note quiet">
          <Mail size={14} /> Trouble getting in? Write to <a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a>.
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

  if (!ready) {
    return (
      <main className="campaign-page">
        <SiteHeader nav={NAV} />
        <div className="campaign-loading" aria-hidden="true" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="campaign-page choose">
        <SiteHeader nav={NAV} />
        <SignInPanel />
      </main>
    );
  }

  if (kind === 'shop') return <ShopDashboard />;
  if (kind === 'advertiser') return <AdvertiserDashboard />;

  return (
    <main className="campaign-page choose">
      <SiteHeader nav={NAV} />
      <section className="choose-side wrap">
        <h1>Which side of the board are you on?</h1>
        <p>
          This picks which workspace opens for {user.email}. You can swap it whenever you like;
          nothing you make on either side is lost.
        </p>
        <div className="choose-grid">
          {ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              className="choose-card"
              data-track={`choose-${account.id}`}
              onClick={() => void setAccount(account.id)}
            >
              <b>{account.label}</b>
              <span>{account.blurb}</span>
              <i>
                {account.action} <ArrowRight size={15} />
              </i>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
