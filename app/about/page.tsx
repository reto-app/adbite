import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, MapPin, Store } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'About',
  description:
    'AdBite is a local screen network in pilot: one metro, a handful of independent shops, and advertisers who want to show up with care.',
};

export default function AboutPage() {
  return <main className="simple-page">
    <SiteHeader
      nav={[
        { href: '/', label: 'For shops' },
        { href: '/advertisers', label: 'For advertisers' },
        { href: '/faq', label: 'FAQ' },
      ]}
      aside={{ href: '/advertisers', label: 'I’m an advertiser' }}
    />

    <section className="simple-hero wrap">
      <h1>Local screens should support the places that hold a neighborhood together.</h1>
      <p>AdBite is starting small: one metro pilot, a few independent shops, and advertisers who want to show up with more care than a random feed placement.</p>
    </section>

    <section className="values wrap">
      <article><span><MapPin/></span><h3>One metro at a time</h3><p>We are testing the model locally first, so the shops and advertisers on the network can actually feel connected.</p></article>
      <article><span><Store/></span><h3>Built for independents</h3><p>Restaurants, barbers, salons, cafés, and other small businesses—not big chains with a corporate playbook.</p></article>
      <article><span><Heart/></span><h3>Respect for the room</h3><p>Shop owners approve every ad. The screen is theirs; AdBite simply helps it earn.</p></article>
    </section>

    <section className="simple-cta wrap">
      <Bite className="bite"/>
      <h2>Have a screen, or a local story to tell?</h2>
      <div>
        <Link className="button invert" href="/#join">Join as a shop <ArrowRight size={16}/></Link>
        <Link className="button ghost" href="/advertisers">Reach local customers</Link>
      </div>
    </section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/faq', label: 'FAQ' },
      { href: 'mailto:hello@adbite.local', label: 'Contact' },
    ]}/>
  </main>;
}
