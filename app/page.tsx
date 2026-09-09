'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Check, ChevronRight, Coffee, MonitorPlay, Scissors, Sparkles, UtensilsCrossed, X } from 'lucide-react';

const ads = [
  { label: 'Now playing · Bottom banner', brand: 'Taco Tuesday', detail: 'Two tacos + agua fresca · $9', color: 'coral' },
  { label: 'Now playing · Full screen', brand: 'Neighbor Dental', detail: 'New patient checkups this week', color: 'sun' },
  { label: 'Now playing · Short video', brand: 'Mia’s Flower Bar', detail: 'Bright stems for your table', color: 'blue' },
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
    <button className="button dark" type="submit">{sent ? 'You’re on the list!' : 'Join the shop waitlist'} <ArrowRight size={16}/></button>
    {sent && <p className="form-note"><Check size={16}/> Thanks—we’ll be in touch when AdBite opens in your city.</p>}
  </form>;
}

export default function Home() {
  const [activeAd, setActiveAd] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setActiveAd(a => (a + 1) % ads.length), 3200); return () => window.clearInterval(timer); }, []);
  const current = ads[activeAd];
  return <main>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="AdBite home"><span className="brand-mark"><span/></span>AdBite</Link>
      <nav><a href="#how">How it works</a><Link href="/about">About</Link><Link href="/faq">FAQ</Link></nav>
      <Link className="audience-link" href="/advertisers">I’m an advertiser <ArrowRight size={15}/></Link>
    </header>

    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse"/> For independent shops</div>
        <h1>Your TV already runs your menu.<br/><em>Let it pay you, too.</em></h1>
        <p className="hero-lede">AdBite turns a small, owner-approved slice of your screen into local ad space—so your shop can earn around <strong>$480 a month</strong>.</p>
        <div className="hero-actions"><a className="button coral" href="#join">Get your shop on AdBite <ArrowRight size={17}/></a><a className="text-link" href="#how">See how it works <ChevronRight size={17}/></a></div>
        <p className="pilot"><BadgeCheck size={16}/> One local metro pilot · Made for shops, not chains</p>
      </div>
      <div className="tv-scene" aria-label="A live example of a menu board with rotating local ads">
        <div className="tv-top"><span className="browser-dot red"/><span className="browser-dot yellow"/><span className="browser-dot green"/><span className="tv-url">screen.adbite.local / the sunny spoon</span></div>
        <div className="tv-screen"><div className="menu-pane"><div className="menu-title">The Sunny Spoon <span>OPEN · 7–3</span></div><div className="menu-grid"><div><b>Breakfast</b><p>Avocado toast <i>$12</i></p><p>Chilaquiles <i>$14</i></p><p>Egg + cheddar roll <i>$8</i></p></div><div><b>Drinks</b><p>Cold brew <i>$5</i></p><p>House lemonade <i>$4</i></p><p>Hibiscus tea <i>$4</i></p></div></div><div className="food-circles"><span>☕</span><span>🍓</span><span>🥐</span></div></div><div className={`ad-panel ${current.color}`} key={activeAd}><small>{current.label}</small><strong>{current.brand}</strong><p>{current.detail}</p><span className="ad-cta">See more <ArrowRight size={12}/></span></div></div>
        <div className="tv-bottom"><span>∞ AdBite player</span><div className="ad-dots">{ads.map((_, i) => <button aria-label={`Show example ad ${i + 1}`} className={i === activeAd ? 'on' : ''} onClick={() => setActiveAd(i)} key={i}/>)}</div><span>Owner-approved</span></div>
      </div>
    </section>

    <section className="numbers-band"><div className="wrap numbers-inner"><div><span className="eyebrow">Simple weekly math</span><h2>A little screen time.<br/>A meaningful extra.</h2></div><div className="calculator"><div className="calc-row"><span>Per ad, each week</span><b>~$20</b></div><div className="calc-row"><span>Rotating ads per screen</span><b>× 6</b></div><div className="calc-total"><span>This can mean</span><strong>$120 <small>/ week</small></strong></div><div className="calc-foot"><span>~$480 / month</span><span>Nearly $6,000 / year</span></div></div></div></section>

    <section id="how" className="section wrap"><div className="section-head"><span className="eyebrow">A calmer way to sell screen space</span><h2>You stay in charge. Always.</h2><p>No surprise ads. No handing over your TV. Just a clear, optional revenue stream that fits around the content your customers need.</p></div><div className="steps">{steps.map(([number, title, text]) => <article className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="approval wrap"><div className="approval-art"><div className="approval-card"><div className="mini-ad"><span>HONEY &amp; STEM</span><b>fresh flowers<br/>for just because</b></div><div className="approval-actions"><button><X size={16}/> Reject</button><button><Check size={16}/> Approve</button></div></div><div className="approval-badge"><BadgeCheck size={20}/><span><b>Your call</b>Every ad gets your okay</span></div></div><div className="approval-copy"><span className="eyebrow">Your screen, your standards</span><h2>Nothing runs without your approval.</h2><p>Every creative arrives in a quick review queue. If it doesn’t match your shop, your customers, or your values, reject it. No explanation needed.</p><ul><li><Check size={17}/> See the ad before it’s scheduled</li><li><Check size={17}/> Approve or reject in one tap</li><li><Check size={17}/> Choose the ad share that feels right</li></ul></div></section>

    <section className="formats"><div className="wrap"><div className="section-head format-head"><div><span className="eyebrow">Built to fit your screen</span><h2>Three ways an ad can show up.</h2></div></div><div className="format-grid"><article><div className="format-preview full"><span>LOCAL FAVORITE</span><b>Spring tune-up<br/>at Moss Auto</b></div><h3>Full-screen spot</h3><p>A bold moment between your own content.</p></article><article><div className="format-preview video"><span>▶ 0:15</span><b>Move with<br/>Northside Yoga</b></div><h3>Short video</h3><p>A quick local story, kept brief and clear.</p></article><article><div className="format-preview banner"><div className="mini-menu">Brunch all day<br/><small>breakfast · lunch · coffee</small></div><b>River City Bikes · free tune-up</b></div><h3>Bottom banner</h3><p>Your menu stays visible—the ad sits below it.</p></article></div></div></section>

    <section className="venues wrap"><div className="section-head"><span className="eyebrow">Made for neighborhood regulars</span><h2>For the places people return to.</h2></div><div className="venue-copy"><article><span><UtensilsCrossed/></span><h3>Restaurants</h3><p>Make your menu board work a little harder between orders.</p></article><article><span><Scissors/></span><h3>Barbers</h3><p>Turn waiting-room watching into a local opportunity.</p></article><article><span><Sparkles/></span><h3>Salons &amp; cosmetics</h3><p>Keep your look and feel while earning from your screen.</p></article><article><span><Coffee/></span><h3>Cafés &amp; more</h3><p>Any independent shop with a TV is welcome.</p></article></div><div className="venue-images"><figure><img src="/images/taco-shop.png" alt="Concept mockup: screen in a neighborhood taco shop"/><figcaption>Concept mockup · Taco shop</figcaption></figure><figure><img src="/images/barbershop.png" alt="Concept mockup: screen in an independent barbershop"/><figcaption>Concept mockup · Barbershop</figcaption></figure><figure><img src="/images/cafe.png" alt="Concept mockup: screen in a neighborhood café"/><figcaption>Concept mockup · Café</figcaption></figure></div></section>

    <section id="join" className="join wrap"><div className="join-copy"><span className="eyebrow">Pilot opening soon</span><h2>Let your screen earn a little extra.</h2><p>Tell us about your shop. We’ll reach out when AdBite is ready in your area.</p><div className="menu-designer"><MonitorPlay size={22}/><div><b>Already thinking about your screen?</b><p>Use our simple <a href="#menu-designer">Menu Designer</a> to sketch your next board.</p></div></div></div><JoinForm/></section>
    <footer><div className="wrap footer-inner"><Link className="brand" href="/"><span className="brand-mark"><span/></span>AdBite</Link><p>Local ads on screens people already watch.</p><div><Link href="/about">About</Link><Link href="/faq">FAQ</Link><a href="mailto:hello@adbite.local">Contact</a><a href="#privacy">Privacy</a></div></div></footer>
  </main>;
}
