import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { ShopsPage } from './shops-page';

/* A thin server shell so the page can carry its own metadata. The body is a
   client component because the hero scene and the join form need state. */
export const metadata: Metadata = {
  title: {
    absolute: 'AdBite for shops · Your menu board, earning between orders',
  },
  description:
    'AdBite turns a slice of your shop screen into local ad space you approve, one creative at a time. Up to $3,000 a year from the TV you already run.',
  alternates: { canonical: `${ORIGIN}/shops` },
  openGraph: {
    type: 'website',
    siteName: 'AdBite',
    title: 'Your TV already runs your menu. Let it pay you, too.',
    description:
      'AdBite turns a slice of your shop screen into local ad space you approve. Up to $3,000 a year from the TV you already run.',
    images: [{ url: '/brand/adbite-og.png', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <ShopsPage />;
}
