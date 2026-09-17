'use client';

import { Link } from '@/components/nav';
import { useAccount } from '@/lib/account';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';
import { LangSwitch } from './lang-switch';
import { Wordmark } from './brand';

/* The dashboard's own bar.
 *
 * The marketing header used to run above the workspace, which put "For
 * advertisers", "For shops" and a sign-in link on top of a page you are
 * already signed in to: four ways to walk out of the product by accident and
 * nothing that belonged to the work. This carries the wordmark, who you are
 * signed in as, and the language. Moving between the two workspaces is the
 * side switch inside the page; leaving is sign-out, next to it. */
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
          <LangSwitch />
        </div>
      </div>
    </header>
  );
}
