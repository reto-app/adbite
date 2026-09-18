import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { AdvertisersPage } from './advertisers-page';

/* The front door is the advertiser page. Shops are onboarded in person and
   by outreach and land on /shops; the people who find AdBite by searching
   are the ones with money to spend on it. /advertisers, where this lived,
   redirects here (vercel.json) so old links and indexed pages still land. */
export const metadata: Metadata = {
  title: { absolute: 'AdBite · A spot on the shop down the street' },
  description:
    'Two ways onto a local menu board: a permanent spot on one screen for the year, or short video at $20 an hour shown. One flat rate at every hour, no auction, and you pay only for time that actually ran.',
  alternates: { canonical: `${ORIGIN}/` },
  openGraph: {
    type: 'website',
    siteName: 'AdBite',
    title: 'Show up where your neighbors already look',
    description:
      'Buy a slice of the menu board at the shop down the street. A spot held for the year, or video by the hour, billed only when it plays.',
    images: [{ url: '/brand/adbite-og.png', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <AdvertisersPage />;
}
