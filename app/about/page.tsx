import type { Metadata } from 'next';
import { Link } from '@/components/nav';
import { ArrowRight, Heart, Mail, MapPin, Store } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAIL, MAILTO } from '@/lib/site';
import { ORIGIN } from '@/lib/site';
import { PILOT_CITY, VENUES } from '@/lib/network';
import { money, weeklyEarnings } from '@/lib/pricing';

export const metadata: Metadata = {
  title: { absolute: 'About AdBite · Three Utah counties, a handful of shops' },
  description:
    'AdBite is a local screen network in pilot across Salt Lake, Utah and Cache counties, built for independent shops and the advertisers who want to show up with care.',
  alternates: { canonical: `${ORIGIN}/about` },
};

const SHOP = VENUES[0];

export default function AboutPage() {
  return <main className="simple-page">
    <SiteHeader
      nav={[
        { href: '/', label: 'For shops' },
        { href: '/advertisers', label: 'For advertisers' },
        { href: '/faq', label: 'FAQ' },
      ]}
      cta={{ href: '/#join', label: 'Join the waitlist' }}
    />

    <section className="simple-hero wrap">
      <h1>Local screens should support the places that hold a neighborhood together.</h1>
      <p>AdBite is starting small and close to home: boards going in above counters across Salt Lake, Utah and Cache counties, the first of them in {PILOT_CITY}, and advertisers who want to show up with more care than a random feed placement.</p>
    </section>

    <section className="values wrap">
      <article><span><MapPin/></span><h3>Three counties at a time</h3><p>Salt Lake, Utah and Cache, and nothing beyond them yet. We are testing the model locally first, so the shops and advertisers on the network can actually feel connected.</p></article>
      <article><span><Store/></span><h3>Built for independents</h3><p>Restaurants, barbers, salons, cafés, and other small businesses, not big chains with a corporate playbook.</p></article>
      <article><span><Heart/></span><h3>Respect for the room</h3><p>Shop owners approve every ad, and the screen stays theirs. AdBite simply helps it earn.</p></article>
    </section>

    <section className="about-plain wrap">
      <h2>Where we actually are</h2>
      <div className="about-facts">
        <div>
          <dt>Stage</dt>
          <dd>Pilot. Boards going in across Salt Lake, Utah and Cache counties, the first live since {SHOP.since}.</dd>
        </div>
        <div>
          <dt>Where it started</dt>
          <dd>{SHOP.name}, {SHOP.street}, {SHOP.city}.</dd>
        </div>
        <div>
          <dt>What a shop earns</dt>
          <dd>From about {money.format(weeklyEarnings(SHOP))} a week per board, more when the larger ad formats sell, and more again on a second screen.</dd>
        </div>
        <div>
          <dt>What we charge advertisers</dt>
          <dd>By the minute, or by the play for video. More at lunch and dinner, more for the formats that take more of the board.</dd>
        </div>
      </div>
      <p className="about-note">
        The illustrated shops elsewhere on this site are examples of the kinds of businesses AdBite
        is built for, not customers. The board screenshots are concept mockups. When that changes,
        this page changes with it.
      </p>
      <p className="about-contact">
        <Mail size={16}/> A real person reads <a href={MAILTO}>{MAIL}</a>. Ask us anything, including
        the awkward questions about a pilot this small.
      </p>
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
      { href: MAILTO, label: 'Contact' },
    ]}/>
  </main>;
}
