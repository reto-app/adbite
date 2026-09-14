'use client';

import { ArrowLeftRight } from 'lucide-react';
import { setAccount, useAccount } from '@/lib/account';

/* Both halves of AdBite are worth seeing, and which one you are looking at is
   a preference rather than a permission, so it is one button away. */
export function SideSwitch() {
  const { ready, kind } = useAccount();
  if (!ready || !kind) return null;
  const other = kind === 'advertiser' ? 'shop' : 'advertiser';

  return (
    <button
      type="button"
      className="side-switch"
      onClick={() => setAccount(other)}
      title="Nothing is signed in. This just picks which workspace opens."
    >
      <ArrowLeftRight size={14} />
      {other === 'shop' ? 'I run a shop' : 'I advertise'}
    </button>
  );
}
