'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  Clapperboard,
  LayoutTemplate,
  MonitorPlay,
  Radio,
  SlidersHorizontal,
  Star,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { BoardReel } from '@/components/board-reel';
import { NetworkMap } from '@/components/network-map';
import { FormatGrid } from '@/components/format-grid';
import { VenueScene } from '@/components/venue-scenes';
import { ShopScene } from '@/components/shop-scene';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Link } from '@/components/nav';
import { VENUES } from '@/lib/network';
import { MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';
import {
  OFF_DAYPARTS,
  PEAK_DAYPARTS,
  count,
  daypartEarnings,
  inventory,
  money,
  monthlyEarnings,
  weeklyCeiling,
  weeklyEarnings,
  yearlyEarnings,
} from '@/lib/pricing';

/* The businesses that buy a counter screen are the ones close enough to walk
   to. Every example on the site is one of those, and says so. */
const ads = [
  { label: 'Now playing · Bottom banner', brand: 'Rosewood Barbers', detail: 'Walk-ins till seven · next door', color: 'coral' },
  { label: 'Now playing · Full screen', brand: 'North Park Dental', detail: 'New patient checkups this week', color: 'sun' },
  { label: 'Now playing · Short video', brand: 'Mia’s Flower Bar', detail: 'Bright stems · corner of 700 North', color: 'blue' },
];

const steps = [
  ['01', 'Connect your screen', 'We help set up your existing TV or menu board.'],
  ['02', 'Advertisers book', 'Local businesses buy minutes on your screen, by the week.'],
  ['03', 'You approve', 'Review each creative. Approve or reject—nothing runs without you.'],
  ['04', 'Content stays yours', 'Ads take about a third of the screen. Your menu keeps the rest.'],
  ['05', 'Get paid', 'Your earnings land monthly, itemised by spot. No invoicing, no chasing.'],
];

const features = [
  [<SlidersHorizontal size={20} key="i"/>, 'Your ad share', 'Set how much of the screen ads can use, down to none at all this week. The rest is always your own content.'],
  [<Check size={20} key="i"/>, 'Approval queue', 'Every creative waits for your yes. Reject anything that does not suit your shop, with no explanation owed.'],
  [<Radio size={20} key="i"/>, 'Screen check', 'We watch that your board is up and playing. If it drops off, you hear it from us first.'],
  [<Wallet size={20} key="i"/>, 'Earnings, itemised', 'See what each spot paid and what is owed, then take your payment once a month.'],
];

const SHOP = VENUES[0];
const sum = (parts: typeof PEAK_DAYPARTS, each: (id: (typeof parts)[number]['id']) => number) =>
  parts.reduce((total, part) => total + each(part.id), 0);

const PEAK_PAY = sum(PEAK_DAYPARTS, (id) => daypartEarnings(SHOP, id));
const OFF_PAY = sum(OFF_DAYPARTS, (id) => daypartEarnings(SHOP, id));

/* The screen is worth running even in a week when no ad sells, and this is the
   half of the product that makes that true. It used to be one line in the
   features grid and a link to a Menu Designer that did not exist. */
const tools = [
  [<LayoutTemplate size={22} key="i"/>, 'Design the board itself',
   'Drag your items around in the browser, set your prices, and push the new menu to the screen. No design software, no waiting on anyone, no call-out fee.'],
  [<Clapperboard size={22} key="i"/>, 'Play your own food',
   'Drop in video of the kitchen, the grill, the thing that sells itself. A board that moves holds a queue better than a board that does not.'],
  [<Star size={22} key="i"/>, 'Put your reviews on the wall',
   'Pull your best Google and Yelp reviews onto the screen and let them run between courses. The people reading it are already standing in your shop.'],
  [<CalendarClock size={22} key="i"/>, 'Different menu, different hour',
   'Breakfast until eleven, lunch until four, the late board after that. Set it once and the screen keeps up on its own.'],
];

function JoinForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="join-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSending(true);
        setError('');
        const result = await submitLead({
          kind: 'shop',
          email: field(data, 'email'),
          detail: {
            shop: field(data, 'shop'),
            type: field(data, 'type'),
            city: field(data, 'city'),
            screens: field(data, 'screens'),
          },
        });
        setSending(false);
        if (result.ok) setSent(true);
        else setError(result.message);
      }}
    >
      <div className="form-grid">
        <label htmlFor="join-shop">Shop name
          <input id="join-shop" name="shop" required placeholder="Sunny Side Café" /></label>
        <label htmlFor="join-type">Shop type
          <select id="join-type" name="type" defaultValue="">
            <option value="" disabled>Select type</option>
            <option>Restaurant</option><option>Barber</option>
            <option>Salon / cosmetics</option><option>Café</option>
            <option>Other independent shop</option>
          </select></label>
        <label htmlFor="join-city">City
          <input id="join-city" name="city" required placeholder="Provo, UT" /></label>
        <label htmlFor="join-screens"># of screens
          <select id="join-screens" name="screens" defaultValue="">
            <option value="" disabled>Choose</option>
            <option>1</option><option>2–3</option><option>4+</option>
          </select></label>
        <label className="form-wide" htmlFor="join-email">Your email
          <input id="join-email" name="email" type="email" required autoComplete="email"
            placeholder="you@yourshop.com" /></label>
      </div>
      <button className="button primary" type="submit" data-track="shop-waitlist-submit" disabled={sending || sent}>
        {sent ? 'You’re on the list' : sending ? 'Sending…' : 'Join the shop waitlist'}
      </button>
      {sent && <p className="form-note"><Check size={16}/> Thanks. We’ll write from AdBite when we reach your city, and we will not pass your details to anyone.</p>}
      {error && <p className="form-warn" role="alert">{error} <a href={MAILTO}>Email us instead</a>.</p>}
      {!sent && !error && <p className="form-note quiet">No contract, no hardware to buy, and you can leave whenever you like.</p>}
    </form>
  );
}

export function HomePage() {
  const [activeAd, setActiveAd] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => setActiveAd(a => (a + 1) % ads.length), 3600);
    return () => window.clearInterval(timer);
  }, []);

  return <main>
    <SiteHeader
      nav={[
        { href: '#how', label: 'How it works' },
        { href: '#earnings', label: 'Earnings' },
        { href: '#tools', label: 'Menu tools' },
        { href: '/faq', label: 'FAQ' },
      ]}
      cta={{ href: '#join', label: 'Join the waitlist' }}
      aside={{ href: '/advertisers', label: 'I’m an advertiser' }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="hero wrap">
        <div className="hero-copy">
          <h1>Your TV already runs your menu.<br/><em>Let it pay you, too.<Bite className="bite"/></em></h1>
          <p className="hero-lede">AdBite turns a slice of your screen into ad space for the businesses on your block. You approve every ad, you get paid every month, and the TV you already run starts paying for itself.</p>
          <div className="hero-actions">
            <a className="button primary" href="#join" data-track="shop-hero-cta">Get your shop on AdBite <ArrowRight size={17}/></a>
            <a className="text-link" href="#earnings" data-track="shop-hero-earnings">See what a screen earns</a>
          </div>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} />
      </section>
    </div>

    <section id="earnings" className="numbers-band"><div className="wrap numbers-inner">
      <div>
        <h2>A little screen time.<br/>A meaningful extra.</h2>
        <p className="band-note">Worked from the one board running today: {SHOP.name}, open {SHOP.hours}, with about a third of the screen sold as ads. Your own hours change the number.</p>
        <ul className="band-points">
          <li><Check size={16}/> Your busy hours are worth more, and are paid as such</li>
          <li><Check size={16}/> Up to {money.format(weeklyCeiling(SHOP))} a week when the bigger formats sell</li>
          <li><Check size={16}/> Paid monthly, itemised by spot</li>
          <li><Check size={16}/> Turn ads off entirely any week you like</li>
        </ul>
      </div>
      <div className="calculator">
        <div className="calc-row"><span>Ad minutes on your board, each week</span><b>{count.format(inventory([SHOP]).minutes)}</b></div>
        <div className="calc-row"><span>Your busy hours · lunch and evening</span><b>{money.format(PEAK_PAY)}</b></div>
        <div className="calc-row"><span>The quiet middle · afternoons</span><b>{money.format(OFF_PAY)}</b></div>
        <div className="calc-total"><span>You are paid</span><strong className="money">{money.format(weeklyEarnings(SHOP))} <small>/ week</small></strong></div>
        <div className="calc-foot"><span>{money.format(monthlyEarnings(SHOP))} / month</span><span>About {money.format(yearlyEarnings(SHOP))} / year</span></div>
      </div>
    </div></section>

    <section id="how" className="section wrap"><div className="section-head"><h2>You stay in charge. Always.</h2><p>No surprise ads. No handing over your TV. Just a clear, optional revenue stream that fits around the content your customers need.</p></div><div className="steps">{steps.map(([number, title, text]) => <article className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="approval wrap"><div className="approval-art"><div className="approval-card"><div className="review-head"><span className="review-tag">In review</span><span>Queued today</span></div><div className="mini-ad"><div className="mini-brand"><i>RB</i><span>Rosewood Barbers<em>4th &amp; Pine · next door</em></span></div><b>Walk-ins till seven</b><p>Fades, beard trims, hot-towel finish. No appointment, no wait list.</p><span className="mini-offer">$5 off your first cut</span></div><dl className="review-details"><dt>Format</dt><dd>Full-screen spot</dd><dt>Length</dt><dd>15 seconds</dd><dt>Rotation</dt><dd>6 turns an hour</dd><dt>Runs</dt><dd>Mon 15 Sep &ndash; Sun 21 Sep</dd></dl><div className="approval-actions"><button type="button"><X size={16}/> Reject</button><button type="button"><Check size={16}/> Approve</button></div></div><div className="approval-badge"><BadgeCheck size={20}/><span><b>Your call</b>Every ad gets your okay</span></div></div><div className="approval-copy"><h2>Nothing runs without your approval.</h2><p>Every creative arrives in a quick review queue. If it doesn’t match your shop, your customers, or your values, reject it. No explanation needed.</p><ul><li><Check size={17}/> See the ad before it’s scheduled</li><li><Check size={17}/> Approve or reject in one tap</li><li><Check size={17}/> Choose the ad share that feels right</li></ul></div></section>

    <section className="formats"><div className="wrap"><div className="section-head format-head"><h2>Four ways an ad can show up.</h2><p>Every format leaves your own content in place, and every format is subject to your approval.</p></div><FormatGrid/></div></section>

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>What it will look like.</h2><p>Four AdBite boards. Watch where the ad sits, and how much of the screen stays the shop&rsquo;s.</p></div><BoardReel/></div></section>

    <section id="tools" className="levelup">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow light">The other half of AdBite</span>
          <h2>Level up your menu.</h2>
          <p>Ads are the part that pays. These are the tools that make the screen worth having in a week when nothing sells, and they come with it.</p>
        </div>
        <div className="tool-grid">
          {tools.map(([icon, title, text]) => (
            <article className="tool" key={title as string}>
              <span>{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <aside className="tv-offer">
          <span className="tv-icon"><Truck size={26}/></span>
          <div>
            <h3>No screen yet? We will bring one.</h3>
            <p>You do not need to buy a TV to start. We can supply the screen, mount it where your customers actually look, run the cable and set the board up on it. Tell us about your counter and we will tell you what it takes.</p>
          </div>
          <a className="button invert" href="#join" data-track="tv-offer-cta">Ask about a screen <ArrowRight size={16}/></a>
        </aside>
      </div>
    </section>

    <section id="features" className="features"><div className="wrap"><div className="section-head"><h2>And the controls that keep it yours.</h2><p>AdBite is the board software and the ad side together, so the tools that pay you are the same ones you use to run your menu. These are the levers on the paying half.</p></div><div className="feature-grid">{features.map(([icon, title, text]) => <article className="feature" key={title as string}><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="venues wrap"><div className="section-head"><h2>For the places people return to.</h2></div><div className="venue-copy"><article><VenueScene kind="restaurant"/><h3>Restaurants</h3><p>Make your menu board work a little harder between orders.</p></article><article><VenueScene kind="barber"/><h3>Barbers</h3><p>Turn waiting-room watching into a local opportunity.</p></article><article><VenueScene kind="salon"/><h3>Salons &amp; cosmetics</h3><p>Keep your look and feel while earning from your screen.</p></article><article><VenueScene kind="cafe"/><h3>Caf&eacute;s &amp; more</h3><p>Any independent shop with a TV is welcome.</p></article></div></section>

    <section id="network" className="network"><div className="wrap"><div className="section-head network-head"><h2>You are joining a network, not a billboard.</h2><p>Shops sign up one block at a time, and advertisers book across the whole map. That is the part that fills your screen: you never have to go sell a single spot yourself.</p></div><NetworkMap/></div></section>

    <section id="join" className="join wrap"><SkyShapes /><div className="join-copy"><span className="eyebrow">Pilot opening soon</span><h2>Let your screen earn a little extra.</h2><p>Tell us about your shop. We’ll reach out when AdBite is ready in your area.</p><div className="menu-designer"><MonitorPlay size={22}/><div><b>Already thinking about your screen?</b><p>See what the board tools can do in <a href="#tools">Level up your menu</a>, or look at the ad side from the buyer&rsquo;s chair in the <Link href="/dashboard">campaign builder</Link>.</p></div></div></div><JoinForm/></section>

    <SiteFooter links={[
      { href: '/about', label: 'About' },
      { href: '/faq', label: 'FAQ' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: MAILTO, label: 'Contact' },
    ]}/>
  </main>;
}
