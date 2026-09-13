import type { Metadata } from 'next';
import { ORIGIN } from '@/lib/site';
import { FaqPage } from './faq-page';

export const metadata: Metadata = {
  title: { absolute: 'AdBite FAQ · Ad share, approvals, rates and payment' },
  description:
    'How much of the screen is advertising, who approves each ad, what advertisers pay at peak and off-peak, and when shops get paid.',
  alternates: { canonical: `${ORIGIN}/faq` },
};

export default function Page() {
  return <FaqPage />;
}
