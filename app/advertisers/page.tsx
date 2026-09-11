'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Monitor, Play, Store } from 'lucide-react';
import { Link } from '@/components/nav';
import { Bite } from '@/components/brand';
import { AdvertiserFlow } from '@/components/advertiser-flow';
import { NORTH_PARK_NOODLE, ShopScene } from '@/components/shop-scene';
import { BoardReel } from '@/components/board-reel';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const tiers = [
  { name: 'Bottom banner', icon: <Monitor/>, text: 'A strip under the menu, in view the whole time someone is deciding what to order.', points: ['Runs while the whole queue reads the board', 'Still image, 1920 × 240', 'Seen on every glance up, not just one'], tone: 'peach' },
  { name: 'Full screen', icon: <Store/>, text: 'The whole board, corner to corner, for your turn in the rotation. Nothing else on it.', points: ['The largest thing in the room', 'Still image, 1920 × 1080', 'Best for one short, plain offer'], tone: 'green' },
  { name: 'Short video', icon: <Play/>, text: 'Fifteen muted seconds in the full-screen slot. Motion in a room where nothing else moves.', points: ['No premium: same rate as a still', 'Up to 0:15, muted, 1920 × 1080', 'Best for showing a place or a process'], tone: 'dark', featured: true },
];

/* Examples on this page are the businesses that would actually buy a slot at
   the counter: near enough to walk to, with an offer that lands while someone
   is already standing still. */
const ads = [
  { label: 'Now playing · Bottom banner', brand: 'Iron Rose Gym', detail: 'First class free · two doors down', color: 'coral' },
  { label: 'Now playing · Full screen', brand: 'Freedom Cycles', detail: 'Free tune-up · two blocks north', color: 'sun' },
  { label: 'Now playing · Short video', brand: 'Ninth Street Books', detail: '10% off with your receipt', color: 'blue' },
];

function AdvertiseForm() {
  const [sent, setSent] = useState(false);
  return <form className="ad-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
    <div className="form-grid">
      <label>Business type<input required placeholder="Florist, dentist, gym…"/></label>
      <label>Where you are<input required placeholder="Provo, UT"/></label>
      <label>Weekly budget<select defaultValue=""><option disabled value="">Choose a range</option><option>$25–$60</option><option>$60–$150</option><option>$150+</option></select></label>
      <label>What you would say<input placeholder="Free tune-up, two blocks north"/></label>
    </div>
    <button type="submit" className="button primary">{sent ? 'Thanks, we’ll be in touch' : 'Put me on the list'}</button>
    {sent && <p className="form-note"><Check size={16}/> We’ll write when there’s a screen on your block.</p>}
  </form>;
}

export default function AdvertisersPage() {
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
        { href: '#packages', label: 'Packages' },
        { href: '#reporting', label: 'Reporting' },
        { href: '/faq', label: 'FAQ' },
      ]}
      aside={{ href: '/', label: 'I’m a shop owner' }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="ad-hero wrap">
        <div>
          <span className="eyebrow"><span className="pulse"/> For local advertisers</span>
          <h1>Show up where your neighbors <em>already look.<Bite className="bite"/></em></h1>
          <p className="hero-lede">Buy a slice of the menu board at the shop down the street. Your ad plays while someone is already standing still, deciding, twenty feet from your front door.</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button primary">Build your campaign <ArrowRight size={17}/></Link>
            <a className="text-link" href="#advertise">Or have us set it up</a>
          </div>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} shop={NORTH_PARK_NOODLE} />
      </section>
    </div>

    <AdvertiserFlow />

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>See it running.</h2><p>Two boards on the network. Your spot sits inside the one thing everyone in the room is already reading, at the exact moment they are deciding what to spend money on.</p></div><BoardReel only={['rosas', 'roost']}/></div></section>

    <section id="packages" className="packages"><div className="wrap"><div className="section-head"><h2>Three shapes. One price.</h2><p>Every format costs the same <b>$0.03 a minute on screen</b>, so pick the one that suits what you have to say, not the one you can afford. The shop approves the creative either way.</p></div><div className="tier-grid">{tiers.map(t => <article key={t.name} className={`tier ${t.tone} ${t.featured ? 'featured' : ''}`}>{t.featured && <span className="popular">No extra charge for motion</span>}<div className="tier-icon">{t.icon}</div><h3>{t.name}</h3><p>{t.text}</p><div className="tier-price"><b>$0.03</b><span> a minute, every format</span></div><ul>{t.points.map(point => <li key={point}><Check size={15}/>{point}</li>)}</ul><Link href="/dashboard">Choose this format</Link></article>)}</div></div></section>

    <section id="reporting" className="reporting wrap"><div className="report-copy"><h2>Know how long your ad was on screen.</h2><p>AdBite reports two things: how many times your ad played, and the total minutes it was on screen. No impressions, no reach estimates, no modelled numbers.</p><div className="report-list"><span><Check size={16}/> Plays each week</span><span><Check size={16}/> Total on-screen minutes</span><span><Check size={16}/> The shops it ran in</span></div></div><div className="dashboard"><div className="dash-top"><span>Weekly report</span><b className="report-tag">Example week</b></div><div className="report-rows"><div><small>Total minutes on screen</small><b>142</b></div><div><small>Times your ad played</small><b>568</b></div><div><small>Shops it ran in</small><b>1</b></div></div><p className="report-empty">A worked example, not a live figure: one shop, one advertiser, a 15-second spot. Your own report shows only the minutes your campaign actually earns, and you are billed on that number.</p></div></section>

    <section id="advertise" className="advertise wrap"><SkyShapes /><div className="advertise-copy"><span className="eyebrow">Start local</span><h2>Not near the pilot shop yet?</h2><p>Tell us where you are. As shops join, we’ll come back to the ones with an advertiser already waiting on the block.</p></div><AdvertiseForm/></section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/about', label: 'About' },
      { href: '/faq', label: 'FAQ' },
      { href: 'mailto:hello@adbite.local', label: 'Contact' },
    ]}/>
  </main>;
}
