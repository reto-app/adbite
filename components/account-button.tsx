'use client';

import { Link, usePath } from '@/components/nav';
import { MonitorPlay } from 'lucide-react';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* The header's right-hand slot.
 *
 * There is no session to show and no self-serve account, so this is the way on
 * to the network rather than an account menu. It used to read "Sign in" and
 * lead to a login nobody could complete. */
export function AccountButton() {
  const pathname = usePath();
  const t = useCopy(SHARED);
  const next = pathname && pathname !== '/signin' ? `?next=${encodeURIComponent(pathname)}` : '';

  return (
    <Link
      className="signin-link"
      href={`/signin${next}`}
      data-track="header-access"
      aria-label={t.header.getOnABoard}
    >
      <MonitorPlay size={15} /> <span>{t.header.getOnABoard}</span>
    </Link>
  );
}
