import type { Metadata } from 'next';
import { Geist, Outfit } from 'next/font/google';
import { Analytics } from '@/components/analytics';
import { IdleMotion } from '@/components/idle-motion';
import { ORIGIN } from '@/lib/site';
import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: {
    default: 'AdBite — Local ads on shop screens',
    template: '%s — AdBite',
  },
  description:
    'AdBite turns a small, owner-approved slice of a shop’s screen into local ad space, so independent restaurants, barbers, salons, and cafés earn from the TVs they already run.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/adbite-icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'AdBite',
    title: 'AdBite — Local ads on shop screens',
    description:
      'Your TV already runs your menu. Let it pay you, too. AdBite is a local screen network for independent shops.',
    images: [{ url: '/brand/adbite-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdBite — Local ads on shop screens',
    description:
      'Your TV already runs your menu. Let it pay you, too.',
    images: ['/brand/adbite-og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${outfit.variable} antialiased`}>
        {children}
        <Analytics />
        <IdleMotion />
      </body>
    </html>
  );
}
