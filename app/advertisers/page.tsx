import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { AdvertisersPage } from './advertisers-page';

export const metadata: Metadata = {
  title: { absolute: 'AdBite for advertisers · Buy minutes on the shop down the street' },
  description:
    'Buy screen time by the minute on local menu boards. $0.15 a minute at lunch and dinner, $0.08 off-peak, no auction and no minimum. You pay only for minutes actually shown.',
  alternates: { canonical: `${ORIGIN}/advertisers` },
  openGraph: {
    type: 'website',
    siteName: 'AdBite',
    title: 'Show up where your neighbors already look',
    description:
      'Buy a slice of the menu board at the shop down the street. Peak and off-peak minutes, billed only when they play.',
    images: [{ url: '/brand/adbite-og.png', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <AdvertisersPage />;
}
