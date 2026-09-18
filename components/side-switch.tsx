'use client';

import { LogOut } from 'lucide-react';
import { clearAccount, useAccount } from '@/lib/account';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* Sign out, and nothing else: an account is one side of the board for good,
   so there is no switch to offer. The name is kept so the two dashboards did
   not have to change. */
export function SideSwitch() {
  const { ready, kind, user } = useAccount();
  const t = useCopy(SHARED);
  if (!ready || !kind || !user) return null;

  return (
    <button
      type="button"
      className="side-switch"
      onClick={() => void clearAccount()}
      title={t.side.signedInAs(user.email)}
    >
      <LogOut size={14} />
      {t.side.signOut}
    </button>
  );
}
