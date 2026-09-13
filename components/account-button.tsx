'use client';

import { Link, usePath } from '@/components/nav';
import { MonitorPlay } from 'lucide-react';

/* The header's right-hand slot.
 *
 * There is no session to show and no self-serve account, so this is the way on
 * to the network rather than an account menu. It used to read "Sign in" and
 * lead to a login nobody could complete. */
export function AccountButton() {
  const pathname = usePath();
  const next = pathname && pathname !== '/signin' ? `?next=${encodeURIComponent(pathname)}` : '';

  return (
    <Link className="signin-link" href={`/signin${next}`} data-track="header-access">
      <MonitorPlay size={15} /> Get on a board
    </Link>
  );
}
