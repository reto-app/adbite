'use client';

import { Link } from '@/components/nav';
import { useAccount } from '@/lib/account';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';
import { LangSwitch } from './lang-switch';
import { SideSwitch } from './side-switch';
import { Wordmark } from './brand';

/* The dashboard's own bar.
 *
 * The marketing header used to run above the workspace, which put "For
 * advertisers", "For shops" and a sign-in link on top of a page you are
 * already signed in to: four ways to walk out of the product by accident and
 * nothing that belonged to the work. This carries the wordmark, who you are
 * signed in as, sign-out, and the language. That is everything the bar needs,
 * so the workspace head below it can be one line. */
export function DashboardHeader() {
  const { user } = useAccount();
  const t = useCopy(SHARED);

  return (
    <header className="site-header dash-bar">
      <div className="header-inner">
        {/* Back to the workspace, never out to the marketing site. */}
        <Link href="/dashboard" className="brand" aria-label={t.header.home}>
          <Wordmark className="brand-word" />
        </Link>
        <div className="header-actions">
          {user && <span className="dash-who">{user.email}</span>}
          <SideSwitch />
          <LangSwitch />
        </div>
      </div>
    </header>
  );
}
