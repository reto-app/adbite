import type { Metadata } from 'next';
import { DashboardPage } from './dashboard-page';

/* Open to anyone, but there is nothing here for a search engine: the campaigns
   live in the visitor's own browser. */
export const metadata: Metadata = {
  title: { absolute: 'Build a campaign · AdBite' },
  description: 'Price a week of local screen time, place your artwork on a real board, and send it for the shop to approve.',
  robots: { index: false, follow: true },
};

export default function Page() {
  return <DashboardPage />;
}
