import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { HomePage } from './home-page';

/* A thin server shell so the page can carry its own metadata. The body is a
   client component because the hero scene and the join form need state. Four
   of the six routes used to share the root title, which meant the advertiser
   page was indexed under copy written for shop owners. */
export const metadata: Metadata = {
  title: {
    absolute: 'AdBite · Your menu board, earning between orders',
  },
  description:
    'AdBite turns a third of your shop screen into local ad space you approve, one creative at a time. About $100 a week from the TV you already run.',
  alternates: { canonical: `${ORIGIN}/` },
};

export default function Page() {
  return <HomePage />;
}
