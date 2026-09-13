import type { Metadata } from 'next';
import { SignInPage } from './signin-page';

export const metadata: Metadata = {
  title: { absolute: 'Advertise on AdBite · Target your city or your neighborhood' },
  description: 'Buy screen time on local menu boards by the city, the neighborhood and the hour. No auction, and you pay only for what actually ran.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SignInPage />;
}
