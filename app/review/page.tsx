import type { Metadata } from 'next';
import { ReviewPage } from './review-page';

export const metadata: Metadata = {
  title: { absolute: 'Review an ad · AdBite' },
  description: 'Approve or turn down an ad booked onto your screen.',
  /* Never indexed and never followed. Every URL that reaches this page carries
     a secret in its query string, and a crawler that found one in a forwarded
     mail or a referrer log has no business holding it. */
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ReviewPage />;
}
