import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { AboutPage } from './about-page';

export const metadata: Metadata = {
  title: { absolute: 'About AdBite · Three Utah counties, a handful of shops' },
  description:
    'AdBite is a local screen network in pilot across Salt Lake, Utah and Cache counties, built for independent shops and the advertisers who want to show up with care.',
  alternates: { canonical: `${ORIGIN}/about` },
};

export default function Page() {
  return <AboutPage />;
}
