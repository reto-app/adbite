'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Coffee,
  MonitorPlay,
  Scissors,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { BoardReel } from '@/components/board-reel';
import { ShopScene } from '@/components/shop-scene';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/* The businesses that buy a counter screen are the ones close enough to walk
   to. Every example on the site is one of those, and says so. */
const ads = [
  { label: 'Now playing · Bottom banner', brand: 'Rosewood Barbers', detail: 'Walk-ins till seven · next door', color: 'coral' },
  { label: 'Now playing · Full screen', brand: 'North Park Dental', detail: 'New patient checkups this week', color: 'sun' },
  { label: 'Now playing · Short video', brand: 'Mia’s Flower Bar', detail: 'Bright stems · corner of 700 North', color: 'blue' },
];
const steps = [
  ['01', 'Connect your screen', 'We help set up your existing TV or menu board.'],
  ['02', 'Advertisers book', 'Local businesses choose a weekly spot on your screen.'],
  ['03', 'You approve', 'Review each creative. Approve or reject—nothing runs without you.'],
  ['04', 'Content stays yours', 'Ads take an agreed share, like 20%. Your menu gets the other 80%.'],
  ['05', 'Get paid', 'See your earnings and receive payment weekly or monthly.'],
];

function JoinForm() {
  const [sent, setSent] = useState(false);
  return <form className="join-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
    <div className="form-grid">
      <label>Shop name<input required placeholder="Sunny Side Café" /></label>
      <label>Shop type<select defaultValue=""><option value="" disabled>Select type</option><option>Restaurant</option><option>Barber</option><option>Salon / cosmetics</option><option>Café</option><option>Other independent shop</option></select></label>
      <label>City<input required placeholder="Denver" /></label>
      <label># of screens<select defaultValue=""><option value="" disabled>Choose</option><option>1</option><option>2–3</option><option>4+</option></select></label>
    </div>
    <button className="button primary" type="submit">{sent ? 'You’re on the list' : 'Join the shop waitlist'}</button>
    {sent && <p className="form-note"><Check size={16}/> Thanks—we’ll be in touch when AdBite opens in your city.</p>}
  </form>;
}

export default function Home() {
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
        { href: '/about', label: 'About' },
        { href: '/faq', label: 'FAQ' },
      ]}
      aside={{ href: '/advertisers', label: 'I’m an advertiser' }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="hero wrap">
        <div className="hero-copy">
          <h1>Your TV already runs your menu.<br/><em>Let it pay you, too.<Bite className="bite"/></em></h1>
          <p className="hero-lede">AdBite turns a small, owner-approved slice of your screen into ad space for the businesses on your block, so the TV you already run starts paying for itself.</p>
          <div className="hero-actions">
            <a className="button primary" href="#join">Get your shop on AdBite <ArrowRight size={17}/></a>
            <a className="text-link" href="#how">See how it works</a>
          </div>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} />
      </section>
    </div>

    <section className="numbers-band"><div className="wrap numbers-inner"><div><h2>A little screen time.<br/>A meaningful extra.</h2><p className="band-note">Weekly math from the pilot, based on six rotating spots on a single screen.</p></div><div className="calculator"><div className="calc-row"><span>Per ad, each week</span><b>~$20</b></div><div className="calc-row"><span>Rotating ads per screen</span><b>× 6</b></div><div className="calc-total"><span>This can mean</span><strong>$120 <small>/ week</small></strong></div><div className="calc-foot"><span>~$480 / month</span><span>Nearly $6,000 / year</span></div></div></div></section>

    <section id="how" className="section wrap"><div className="section-head"><h2>You stay in charge. Always.</h2><p>No surprise ads. No handing over your TV. Just a clear, optional revenue stream that fits around the content your customers need.</p></div><div className="steps">{steps.map(([number, title, text]) => <article className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="approval wrap"><div className="approval-art"><div className="approval-card"><div className="mini-ad"><span>ROSEWOOD BARBERS</span><b>walk-ins till seven<br/>next door to you</b></div><div className="approval-actions"><button><X size={16}/> Reject</button><button><Check size={16}/> Approve</button></div></div><div className="approval-badge"><BadgeCheck size={20}/><span><b>Your call</b>Every ad gets your okay</span></div></div><div className="approval-copy"><h2>Nothing runs without your approval.</h2><p>Every creative arrives in a quick review queue. If it doesn’t match your shop, your customers, or your values, reject it. No explanation needed.</p><ul><li><Check size={17}/> See the ad before it’s scheduled</li><li><Check size={17}/> Approve or reject in one tap</li><li><Check size={17}/> Choose the ad share that feels right</li></ul></div></section>

    <section className="formats"><div className="wrap"><div className="section-head format-head"><h2>Three ways an ad can show up.</h2><p>Every format leaves your own content in place, and every format is subject to your approval.</p></div><div className="format-grid"><article><div className="format-preview full"><span>TWO BLOCKS NORTH</span><b>Free tune-up<br/>at Freedom Cycles</b></div><h3>Full-screen spot</h3><p>The whole board for one turn, then your menu is back.</p></article><article><div className="format-preview video"><span>▶ 0:15</span><b>First class free<br/>at Iron Rose Gym</b></div><h3>Short video</h3><p>Fifteen muted seconds. No sound to talk over.</p></article><article><div className="format-preview banner"><div className="mini-menu">Brunch all day<br/><small>breakfast · lunch · coffee</small></div><b>Ninth Street Books · 10% off with your receipt</b></div><h3>Bottom banner</h3><p>Your menu stays where it is. The ad takes the strip below.</p></article></div></div></section>

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>Boards already running this.</h2><p>Four real AdBite boards. Watch where the ad sits, and how much of the screen stays the shop&rsquo;s.</p></div><BoardReel/></div></section>

    <section className="venues wrap"><div className="section-head"><h2>For the places people return to.</h2></div><div className="venue-copy"><article><span><UtensilsCrossed/></span><h3>Restaurants</h3><p>Make your menu board work a little harder between orders.</p></article><article><span><Scissors/></span><h3>Barbers</h3><p>Turn waiting-room watching into a local opportunity.</p></article><article><span><Sparkles/></span><h3>Salons &amp; cosmetics</h3><p>Keep your look and feel while earning from your screen.</p></article><article><span><Coffee/></span><h3>Cafés &amp; more</h3><p>Any independent shop with a TV is welcome.</p></article></div><div className="venue-images"><figure><img src="/images/taco-shop.png" alt="Concept mockup: screen in a neighborhood taco shop"/><figcaption>Concept mockup · Taco shop</figcaption></figure><figure><img src="/images/barbershop.png" alt="Concept mockup: screen in an independent barbershop"/><figcaption>Concept mockup · Barbershop</figcaption></figure><figure><img src="/images/cafe.png" alt="Concept mockup: screen in a neighborhood café"/><figcaption>Concept mockup · Café</figcaption></figure></div></section>

    <section id="join" className="join wrap"><SkyShapes /><div className="join-copy"><span className="eyebrow">Pilot opening soon</span><h2>Let your screen earn a little extra.</h2><p>Tell us about your shop. We’ll reach out when AdBite is ready in your area.</p><div className="menu-designer"><MonitorPlay size={22}/><div><b>Already thinking about your screen?</b><p>Use our simple <a href="#menu-designer">Menu Designer</a> to sketch your next board.</p></div></div></div><JoinForm/></section>

    <SiteFooter links={[
      { href: '/about', label: 'About' },
      { href: '/faq', label: 'FAQ' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: 'mailto:hello@adbite.local', label: 'Contact' },
    ]}/>
  </main>;
}
