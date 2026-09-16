'use client';

import { ArrowLeftRight, LogOut } from 'lucide-react';
import { clearAccount, setAccount, useAccount } from '@/lib/account';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* Both halves of AdBite are worth seeing, and one account can stand on
   either, so the other side is one button away. Sign-out sits beside it. */
export function SideSwitch() {
  const { ready, kind, user } = useAccount();
  const t = useCopy(SHARED);
  if (!ready || !kind || !user) return null;
  const other = kind === 'advertiser' ? 'shop' : 'advertiser';

  return (
    <>
      <button
        type="button"
        className="side-switch"
        onClick={() => void setAccount(other)}
        title={t.side.switchTitle}
      >
        <ArrowLeftRight size={14} />
        {other === 'shop' ? t.side.iRunAShop : t.side.iAdvertise}
      </button>
      <button
        type="button"
        className="side-switch"
        onClick={() => void clearAccount()}
        title={t.side.signedInAs(user.email)}
      >
        <LogOut size={14} />
        {t.side.signOut}
      </button>
    </>
  );
}
