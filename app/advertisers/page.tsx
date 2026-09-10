'use client';

import { useState } from 'react';
import { ArrowRight, BarChart3, Check, MapPin, Monitor, Play, Store } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const tiers = [
  { name: 'Bottom banner', price: '$20', icon: <Monitor/>, text: 'A steady, unobtrusive spot under a menu or show.', points: ['1 venue category', '1 screen package', 'Weekly play-time report'], tone: 'peach' },
  { name: 'Full-screen', price: '$35', icon: <Store/>, text: 'A bright local moment between the venue’s content.', points: ['Choose venue category', 'Static creative', 'Weekly plays + minutes'], tone: 'green' },
  { name: 'Short video', price: '$50', icon: <Play/>, text: 'A short story that feels right at home in the neighborhood.', points: ['Specific venue package', 'Up to 15 seconds', 'Weekly plays + minutes'], tone: 'dark', featured: true },
];

function AdvertiseForm() {
  const [sent, setSent] = useState(false);
  return <form className="ad-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
    <div className="form-grid">
      <label>Business type<input required placeholder="Florist, dentist, gym…"/></label>
      <label>City<input required placeholder="Denver"/></label>
      <label>Weekly budget<select defaultValue=""><option disabled value="">Choose a range</option><option>$20–$50</option><option>$50–$150</option><option>$150+</option></select></label>
      <label>Preferred venues<input placeholder="Cafés, salons, taco shops…"/></label>
    </div>
    <button type="submit" className="button primary">{sent ? 'Thanks, we’ll be in touch' : 'Advertise on AdBite'}</button>
    {sent && <p className="form-note"><Check size={16}/> We’ll help find screens that suit your neighborhood.</p>}
  </form>;
}

export default function AdvertisersPage() {
  return <main className="advertiser-page">
    <SiteHeader
      nav={[
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
          <p>Reach real people on the screens inside the cafés, restaurants, salons, and barbershops they already visit. Book simple weekly placements, not confusing ad-tech campaigns.</p>
          <a href="#advertise" className="button primary">Advertise on AdBite <ArrowRight size={17}/></a>
        </div>
        <div className="screen-stack">
          <div className="mini-screen one"><span>THE SUNNY SPOON</span><b>Need lunch?<br/>Meet us down the block.</b><small>Neighborhood ad · 0:15</small></div>
          <div className="mini-screen two"><span><MapPin size={13}/> Your local route</span><div className="route-dots"><i/><i/><i/><i/></div><b>6 favorite<br/>places. One week.</b></div>
          <div className="screen-note"><BarChart3 size={18}/><span><b>Local, measurable</b>Play time, not vague impressions</span></div>
        </div>
      </section>
    </div>

    <section id="packages" className="packages"><div className="wrap"><div className="section-head"><h2>Pick the space that fits your story.</h2><p>Weekly starting prices shown below are placeholders for the pilot. Final availability depends on the shop and neighborhood you choose.</p></div><div className="tier-grid">{tiers.map(t => <article key={t.name} className={`tier ${t.tone} ${t.featured ? 'featured' : ''}`}>{t.featured && <><Bite className="bite"/><span className="popular">Good for a quick story</span></>}<div className="tier-icon">{t.icon}</div><h3>{t.name}</h3><p>{t.text}</p><div className="tier-price"><b>{t.price}</b><span> / week, starting</span></div><ul>{t.points.map(point => <li key={point}><Check size={15}/>{point}</li>)}</ul><a href="#advertise">Choose this format</a></article>)}</div></div></section>

    <section id="reporting" className="reporting wrap"><div className="report-copy"><h2>Know how long your ad was on screen.</h2><p>AdBite keeps the reporting useful and honest: the number of times your ad played and the total minutes it was shown. No mystery metrics.</p><div className="report-list"><span><Check size={16}/> Plays each week</span><span><Check size={16}/> Total on-screen minutes</span><span><Check size={16}/> Venues in your package</span></div></div><div className="dashboard"><div className="dash-top"><span>Campaign snapshot</span><b>Aug 12–18</b></div><div className="dash-title"><div><small>Time on screen</small><strong>124 <i>minutes</i></strong></div><span className="up">↑ 18%</span></div><div className="chart"><i style={{height:'39%'}}/><i style={{height:'60%'}}/><i style={{height:'48%'}}/><i style={{height:'72%'}}/><i style={{height:'64%'}}/><i style={{height:'86%'}}/><i style={{height:'76%'}}/></div><div className="dash-bottom"><div><small>Plays this week</small><b>496</b></div><div><small>Venues</small><b>4 shops</b></div><div><small>Format</small><b>Video</b></div></div></div></section>

    <section id="advertise" className="advertise wrap"><SkyShapes /><div><span className="eyebrow">Start local</span><h2>Tell us where you want to show up.</h2><p>We’ll match you with neighborhood screens as the pilot rolls out.</p></div><AdvertiseForm/></section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/about', label: 'About' },
      { href: '/faq', label: 'FAQ' },
      { href: 'mailto:hello@adbite.local', label: 'Contact' },
    ]}/>
  </main>;
}
