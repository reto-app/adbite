import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { PrivacyPage } from './privacy-page';

export const metadata: Metadata = {
  title: { absolute: 'AdBite privacy · What we collect and why' },
  description: 'What AdBite collects when you use this site, where it goes, and how to have it deleted.',
  alternates: { canonical: `${ORIGIN}/privacy` },
};

export default function Page() {
  return <PrivacyPage />;
}
