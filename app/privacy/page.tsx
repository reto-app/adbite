import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAILTO, ORIGIN, SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'AdBite privacy · What we collect and why' },
  description: 'What AdBite collects when you use this site, where it goes, and how to have it deleted.',
  alternates: { canonical: `${ORIGIN}/privacy` },
};

/* Written from what the code actually does rather than from a template. If the
   forms, the analytics or the map tiles change, change this with them. */
export default function PrivacyPage() {
  return <main className="simple-page legal-page">
    <SiteHeader nav={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/faq', label: 'FAQ' },
    ]}/>

    <section className="legal wrap">
      <h1>Privacy</h1>
      <p className="legal-date">Last updated September 2026. AdBite is a pilot, so this is short and specific rather than long and general.</p>

      <h2>What we collect</h2>
      <p>Only what you type into a form. The shop waitlist takes your shop name, shop type, city, number of screens and your email address. The advertiser form takes your business type, location, budget range, the line you would want to run, and your email. The campaign builder takes your email when you submit a booking, plus the campaign settings you chose.</p>

      <h2>Where it goes</h2>
      <p>Straight to AdBite, so a person can reply to you. We do not sell it, rent it, or pass it to advertisers or shops without asking you first. If we cannot deliver your submission we tell you so on the page rather than quietly dropping it.</p>

      <h2>Your account</h2>
      <p>Signing in takes your email address and nothing else; we send a link rather than storing a password. What you make while signed in, a shop&rsquo;s menu board, the ads a business books and the shop&rsquo;s decision on each, is stored with Supabase in the United States so it reaches your screens and is there on your next device. Artwork you upload for a preview stays in your browser until a booking is placed.</p>

      <h2>Mail we send</h2>
      <p>Sign-in links, a note when a booking arrives for your shop, and a note when a shop has decided on your ad. Those go through Resend. No newsletters and nothing you did not ask for by using the product.</p>

      <h2>Analytics</h2>
      <p>We count page views and which buttons get used, so we can tell which parts of this site are confusing. It is aggregate and cookieless: no profiles, no cross-site tracking, no advertising pixels.</p>

      <h2>Maps</h2>
      <p>The shop map loads tiles from OpenStreetMap, which means your browser makes a request to their servers and they see your IP address. Besides Supabase and Resend above, that is the only third party this site talks to.</p>

      <h2>Having it removed</h2>
      <p>Write to <a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a> and ask. We will delete what we hold and confirm when it is done. You do not need to give a reason.</p>
    </section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/faq', label: 'FAQ' },
      { href: MAILTO, label: 'Contact' },
    ]}/>
  </main>;
}
