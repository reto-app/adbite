'use client';

import { useEffect } from 'react';

/* Carry the hash across, so /advertisers#packages still lands on the rate
   card. `replace` keeps the old URL out of the back button. */
export function Bounce() {
  useEffect(() => {
    window.location.replace(`/${window.location.search}${window.location.hash}`);
  }, []);
  return (
    <main className="campaign-page">
      <div className="campaign-loading" aria-hidden="true" />
    </main>
  );
}
