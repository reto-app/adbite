'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Columns3, Monitor, Play, Store, Cloud, Sun } from 'lucide-react';
import { Link } from '@/components/nav';
import { Bite } from '@/components/brand';
import { AdvertiserFlow } from '@/components/advertiser-flow';
import { NORTH_PARK_NOODLE, ShopScene } from '@/components/shop-scene';
import { BoardReel } from '@/components/board-reel';
import { NetworkMap } from '@/components/network-map';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';
import { FORMATS } from '@/lib/boards';
import { VENUES } from '@/lib/network';
import {
  DAYPARTS,
  RATE_FLOOR,
  cents,
  count,
  inventory,
  rateFor,
  unitOf,
  weeklyMinutes,
} from '@/lib/pricing';

/* Icon and tone per format. The formats themselves, and their specs, come from
   lib/boards.ts so the marketing page and the builder cannot disagree about
   how many there are: this page used to sell three while the product shipped
   four, and the missing one was the side rail. */
const LOOK: Record<string, { icon: React.ReactNode; tone: string; sell: string; note: string }> = {
  banner: {
    icon: <Monitor />, tone: 'peach',
    sell: 'A strip under the menu, in view the whole time someone is deciding what to order.',
    note: 'The least of the board, so the least to pay.',
  },
  rail: {
    icon: <Columns3 />, tone: 'green',
    sell: 'The right third, top to bottom. Holds the screen continuously without ever hiding the menu.',
    note: 'More of the board than a strip, and priced for it.',
  },
  full: {
    icon: <Store />, tone: 'dark',
    sell: 'The whole board for your turn in the rotation. Nothing else on it.',
    note: 'The menu is gone while it runs, which is what you are paying for.',
  },
  video: {
    icon: <Play />, tone: 'blue',
    sell: 'Fifteen muted seconds in the full-screen slot. Motion in a room where nothing else moves.',
    note: 'Billed per play, not per minute. You buy a count of runs.',
  },
};

const ads = [
  { label: 'Now playing · Bottom banner', brand: 'Iron Rose Gym', detail: 'First class free · two doors down', color: 'coral' },
  { label: 'Now playing · Full screen', brand: 'Freedom Cycles', detail: 'Free tune-up · two blocks north', color: 'sun' },
  { label: 'Now playing · Short video', brand: 'Ninth Street Books', detail: '10% off with your receipt', color: 'blue' },
];

const SHOP = VENUES[0];

function AdvertiseForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="ad-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSending(true);
        setError('');
        const result = await submitLead({
          kind: 'advertiser',
          email: field(data, 'email'),
          detail: {
            business: field(data, 'business'),
            where: field(data, 'where'),
            budget: field(data, 'budget'),
            message: field(data, 'message'),
          },
        });
        setSending(false);
        if (result.ok) setSent(true);
        else setError(result.message);
      }}
    >
      <div className="form-grid">
        <label htmlFor="ad-business">Business type
          <input id="ad-business" name="business" required placeholder="Florist, dentist, gym…" /></label>
        <label htmlFor="ad-where">Where you are
          <input id="ad-where" name="where" required placeholder="Provo, UT" /></label>
        <label htmlFor="ad-budget">Weekly budget
          <select id="ad-budget" name="budget" defaultValue="">
            <option disabled value="">Choose a range</option>
            <option>$25–$60</option><option>$60–$150</option><option>$150+</option>
          </select></label>
        <label htmlFor="ad-message">What you would say
          <input id="ad-message" name="message" placeholder="Free tune-up, two blocks north" /></label>
        <label className="form-wide" htmlFor="ad-email">Your email
          <input id="ad-email" name="email" type="email" required autoComplete="email" placeholder="you@yourbusiness.com" /></label>
      </div>
      <button type="submit" className="button primary" data-track="adv-waitlist-submit" disabled={sending || sent}>
        {sent ? 'Thanks, we’ll be in touch' : sending ? 'Sending…' : 'Put me on the list'}
      </button>
      {sent && <p className="form-note"><Check size={16}/> We’ll write when there’s a screen near you.</p>}
      {error && <p className="form-warn" role="alert">{error} <a href={MAILTO}>Email us instead</a>.</p>}
    </form>
  );
}

export function AdvertisersPage() {
  const [activeAd, setActiveAd] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => setActiveAd(a => (a + 1) % ads.length), 3600);
    return () => window.clearInterval(timer);
  }, []);

  return <main className="advertiser-page">
    <SiteHeader
      nav={[
        { href: '#flow', label: 'How it works' },
        { href: '#packages', label: 'Rates' },
        { href: '#reporting', label: 'Reporting' },
        { href: '/faq', label: 'FAQ' },
      ]}
      cta={{ href: '/dashboard', label: 'Build a campaign' }}
      aside={{ href: '/', label: 'I’m a shop owner' }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="ad-hero wrap">
        <div>
          <h1>Show up where your neighbors <em>already look.<Bite className="bite"/></em></h1>
          <p className="hero-lede">Buy a slice of the menu board at a shop in your neighborhood. Your ad plays while someone is standing at the counter, already deciding what to spend money on. Pick the city, the area and the hours, from {cents.format(RATE_FLOOR)} a minute.</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button primary" data-track="adv-hero-build">Build your campaign <ArrowRight size={17}/></Link>
            <a className="text-link" href="#advertise" data-track="adv-hero-contact">Or have us set it up</a>
          </div>
          <p className="hero-foot">No account needed, and none to create: we are in pilot and not open for volume yet. Price it, put your artwork on a real board, then send it to us when you want it to run.</p>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} shop={NORTH_PARK_NOODLE} />
      </section>
    </div>

    <AdvertiserFlow />

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>See it running.</h2><p>Two boards on the network. Your spot sits inside the one thing everyone in the room is already reading, at the exact moment they are deciding what to spend money on.</p></div><BoardReel only={['rosas', 'roost']}/></div></section>

    <section id="network" className="network"><div className="wrap"><div className="section-head network-head"><h2>Book one block, or the whole map.</h2><p>Every shop on AdBite is a counter someone is already standing at. The pilot board is in Provo and holds {count.format(inventory([SHOP]).minutes)} minutes of ad time a week. No media buyer, no minimum, no billboard contract.</p></div><NetworkMap/></div></section>

    <section id="packages" className="packages"><div className="wrap">
      <div className="section-head"><h2>Four shapes. Priced on two things.</h2><p>How much of the board your ad takes, and <b>when</b> it runs. A strip under the menu is the cheapest thing we sell. Blanking the whole board costs the most, because while it runs the shop&rsquo;s own menu is gone. Peak is lunch and dinner, when there is a queue; the afternoon is about half.</p></div>

      <div className="rate-band">
        {DAYPARTS.map((part) => (
          <article key={part.id} className={`rate-slab ${part.tier}`}>
            <span className="rate-slab-head">{part.tier === 'peak' ? <Sun size={16}/> : <Cloud size={16}/>}<b>{part.label}</b><i>{part.window}</i></span>
            <strong className="money">{cents.format(rateFor('banner', part.id))}<small> / min</small></strong>
            <span className="rate-slab-foot">{part.tier === 'peak' ? 'Peak' : 'Off-peak'} · from, for a bottom banner · {count.format(weeklyMinutes(SHOP, part.id))} min free</span>
          </article>
        ))}
      </div>

      <div className="tier-grid">{FORMATS.map(format => {
        const look = LOOK[format.id];
        const perPlay = unitOf(format.id) === 'play';
        return <article key={format.id} className={`tier ${look.tone}`}>
          <div className="tier-icon">{look.icon}</div>
          <h3>{format.name}</h3>
          <p>{look.sell}</p>
          <div className="tier-price">
            <b className="money">{cents.format(rateFor(format.id, 'lunch'))}</b>
            <span>peak, per {perPlay ? 'play' : 'minute'}</span>
            <span className="tier-off">{cents.format(rateFor(format.id, 'afternoon'))} off-peak</span>
          </div>
          <ul>
            <li><Check size={15}/>{look.note}</li>
            <li><Check size={15}/>{format.spec}</li>
            <li><Check size={15}/>{perPlay ? 'You pay for plays that ran' : 'You pay for minutes shown'}</li>
          </ul>
          <Link href="/dashboard" data-track="adv-tier-build">Build one <ArrowRight size={15}/></Link>
        </article>;
      })}</div>

      <p className="packages-foot">
        Every price above is what you pay. There is no auction, no bidding against a national brand
        for the shop on your corner, and no rate that moves because of who else showed up that week.
      </p>
    </div></section>

    <section id="reporting" className="reporting wrap"><div className="report-copy"><h2>Know how long your ad was on screen.</h2><p>AdBite reports two things: how many times your ad played, and the total minutes it was on screen. No impressions, no reach estimates, no modelled numbers.</p><div className="report-list"><span><Check size={16}/> Plays each week</span><span><Check size={16}/> On-screen minutes, or plays for a video, split peak and off-peak</span><span><Check size={16}/> The shops it ran in</span></div></div><div className="dashboard"><div className="dash-top"><span>Weekly report</span><b className="report-tag">Example week</b></div><div className="report-rows"><div><small>Peak minutes</small><b>96</b></div><div><small>Off-peak minutes</small><b>46</b></div><div><small>Times your ad played</small><b>568</b></div></div><p className="report-empty">A worked example, not a live figure: one shop, one advertiser, a 15-second spot. Your own report shows only the minutes your campaign actually earns, and you are billed on that number.</p></div></section>

    <section id="advertise" className="advertise wrap"><SkyShapes /><div className="advertise-copy"><span className="eyebrow">Start local</span><h2>Not near the pilot shop yet?</h2><p>Tell us where you are. As shops join, we’ll come back to the ones with an advertiser already waiting on the block.</p></div><AdvertiseForm/></section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/about', label: 'About' },
      { href: '/faq', label: 'FAQ' },
      { href: MAILTO, label: 'Contact' },
    ]}/>
  </main>;
}
