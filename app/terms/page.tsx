import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { TermsPage } from './terms-page';

export const metadata: Metadata = {
  title: { absolute: 'AdBite pilot terms · What each side is agreeing to' },
  description:
    'The plain commitments AdBite makes to shops and to advertisers during the pilot: approval rights, what a spot and video each cost, and billing on time actually shown.',
  alternates: { canonical: `${ORIGIN}/terms` },
};

export default function Page() {
  return <TermsPage />;
}
