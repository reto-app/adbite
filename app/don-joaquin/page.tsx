import type { Metadata } from 'next';
import { BookHere } from '@/components/book-here';

/* Where the QR code in the Don Joaquín ad lands, by way of /q/dj (api/qr.ts),
   which counts the scan first. */
export const metadata: Metadata = {
  title: { absolute: 'Advertise at Don Joaquín Street Tacos, Provo · AdBite' },
  description: 'Put your business on the screen at Don Joaquín Street Tacos in Provo. Make an account, upload your ad, book it.',
  robots: { index: false, follow: true },
};

export default function Page() {
  return <BookHere venueId="don-joaquin-provo" />;
}
