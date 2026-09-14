'use client';

import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { AdvertiserDashboard } from '@/app/dashboard/advertiser-dashboard';
import { ShopDashboard } from '@/app/dashboard/shop-dashboard';
import { ACCOUNTS, setAccount, useAccount } from '@/lib/account';

const NAV = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
];

/* /dashboard is both workspaces.
 *
 * There is no login, so the fork is a stored preference rather than a
 * permission, and it is switchable from inside either side. The two halves of
 * the product genuinely are one product: the ad a shop approves here is the ad
 * an advertiser built on the other side, and the share the shop sets is the
 * inventory the advertiser is buying. */
export function DashboardPage() {
  const { ready, kind } = useAccount();

  if (!ready) {
    return (
      <main className="campaign-page">
        <SiteHeader nav={NAV} />
        <div className="campaign-loading" aria-hidden="true" />
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
          Nothing here is a sign-up, and there is nothing to create. This picks which workspace
          opens, and you can swap it whenever you like.
        </p>
        <div className="choose-grid">
          {ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              className="choose-card"
              data-track={`choose-${account.id}`}
              onClick={() => setAccount(account.id)}
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
