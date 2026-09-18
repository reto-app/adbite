import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { Bounce } from './bounce';

/* The advertiser page used to live here and now lives at /. On Vercel the
   redirect in vercel.json answers first, with a 308, and this is never
   served; it exists so the route still resolves under `vinext dev` and on
   any host without that config, and so a crawler that does reach it is told
   where the page went rather than shown a copy of it. */
export const metadata: Metadata = {
  title: { absolute: 'AdBite' },
  robots: { index: false, follow: true },
  alternates: { canonical: `${ORIGIN}/` },
};

export default function Page() {
  return <Bounce />;
}
