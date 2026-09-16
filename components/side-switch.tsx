'use client';

import { ArrowLeftRight, LogOut } from 'lucide-react';
import { clearAccount, setAccount, useAccount } from '@/lib/account';

/* Both halves of AdBite are worth seeing, and one account can stand on
   either, so the other side is one button away. Sign-out sits beside it. */
export function SideSwitch() {
  const { ready, kind, user } = useAccount();
  if (!ready || !kind || !user) return null;
  const other = kind === 'advertiser' ? 'shop' : 'advertiser';

  return (
    <>
      <button
        type="button"
        className="side-switch"
        onClick={() => void setAccount(other)}
        title="Switch which workspace opens. Nothing on either side is lost."
      >
        <ArrowLeftRight size={14} />
        {other === 'shop' ? 'I run a shop' : 'I advertise'}
      </button>
      <button
        type="button"
        className="side-switch"
        onClick={() => void clearAccount()}
        title={`Signed in as ${user.email}`}
      >
        <LogOut size={14} />
        Sign out
      </button>
    </>
  );
}
