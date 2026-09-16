'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Columns3, Monitor, Play, Store, Cloud, Sun } from 'lucide-react';
import { Link } from '@/components/nav';
import { Bite } from '@/components/brand';
import { AdvertiserFlow } from '@/components/advertiser-flow';
import { NORTH_PARK_NOODLE, ShopScene } from '@/components/shop-scene';
import { BoardReel } from '@/components/board-reel';
import { DashboardReel } from '@/components/dashboard-reel';
import { NetworkMap } from '@/components/network-map';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';
import { FORMATS } from '@/lib/boards';
import { VENUES } from '@/lib/network';
import { useCopy, useLang } from '@/lib/lang';
import { ADVERTISERS } from '@/lib/copy/advertisers';
import { SHARED } from '@/lib/copy/shared';
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
   how many there are; the selling lines are in lib/copy/advertisers.ts. */
const LOOK: Record<string, { icon: React.ReactNode; tone: string }> = {
  banner: { icon: <Monitor />, tone: 'peach' },
  rail: { icon: <Columns3 />, tone: 'green' },
  full: { icon: <Store />, tone: 'dark' },
  video: { icon: <Play />, tone: 'blue' },
};

const AD_COLORS = ['coral', 'sun', 'blue'];
const SHOP = VENUES[0];

function AdvertiseForm() {
  const t = useCopy(ADVERTISERS).advertise.form;
  const shared = useCopy(SHARED);
  const { lang } = useLang();
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
          lang,
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
        <label htmlFor="ad-business">{t.business}
          <input id="ad-business" name="business" required placeholder={t.businessPlaceholder} /></label>
        <label htmlFor="ad-where">{t.where}
          <input id="ad-where" name="where" required placeholder={t.wherePlaceholder} /></label>
        <label htmlFor="ad-budget">{t.budget}
          <select id="ad-budget" name="budget" defaultValue="">
            <option disabled value="">{t.budgetPlaceholder}</option>
            <option>$25–$60</option><option>$60–$150</option><option>$150+</option>
          </select></label>
        <label htmlFor="ad-message">{t.message}
          <input id="ad-message" name="message" placeholder={t.messagePlaceholder} /></label>
        <label className="form-wide" htmlFor="ad-email">{t.email}
          <input id="ad-email" name="email" type="email" required autoComplete="email" placeholder={t.emailPlaceholder} /></label>
      </div>
      <button type="submit" className="button primary" data-track="adv-waitlist-submit" disabled={sending || sent}>
        {sent ? t.thanks : sending ? shared.form.sending : t.submit}
      </button>
      {sent && <p className="form-note"><Check size={16}/> {t.note}</p>}
      {error && <p className="form-warn" role="alert">{error} <a href={MAILTO}>{shared.form.emailUsInstead}</a>.</p>}
    </form>
  );
}

export function AdvertisersPage() {
  const t = useCopy(ADVERTISERS);
  const shared = useCopy(SHARED);
  const ads = t.ads.map((ad, i) => ({ ...ad, color: AD_COLORS[i] }));
  const [activeAd, setActiveAd] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => setActiveAd(a => (a + 1) % ads.length), 3600);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  const minutes = count.format(inventory([SHOP]).minutes);
  const [n0, n1, n2, n3, n4, n5, n6] = t.network.lede(minutes);

  return <main className="advertiser-page">
    <SiteHeader
      nav={[
        { href: '#flow', label: t.nav.flow },
        { href: '#packages', label: t.nav.packages },
        { href: '#reporting', label: t.nav.reporting },
        { href: '/faq', label: shared.nav.faq },
      ]}
      cta={{ href: '/dashboard', label: shared.header.buildCampaign }}
      aside={{ href: '/', label: shared.header.imAShopOwner }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="ad-hero wrap">
        <div>
          <h1>{t.hero.title1}<em>{t.hero.title2}<Bite className="bite"/></em></h1>
          <p className="hero-lede">{t.hero.lede(cents.format(RATE_FLOOR))}</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button primary" data-track="adv-hero-build">{t.hero.build} <ArrowRight size={17}/></Link>
            <a className="text-link" href="#advertise" data-track="adv-hero-contact">{t.hero.orContact}</a>
          </div>
          <p className="hero-foot">{t.hero.foot}</p>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} shop={NORTH_PARK_NOODLE} />
      </section>
    </div>

    <AdvertiserFlow />

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>{t.boards.title}</h2><p>{t.boards.lede}</p></div><BoardReel only={['rosas', 'roost']}/></div></section>

    <section id="network" className="network"><div className="wrap"><div className="section-head network-head"><h2>{t.network.title}</h2><p>{n0}<b>{n1}</b>{n2}<b>{n3}</b>{n4}<b>{n5}</b>{n6}</p></div><NetworkMap/></div></section>

    <section id="packages" className="packages"><div className="wrap">
      <div className="section-head"><h2>{t.packages.title}</h2><p>{t.packages.ledeBefore}<b>{t.packages.ledeWhen}</b>{t.packages.ledeAfter}</p></div>

      <div className="rate-band">
        {DAYPARTS.map((part) => (
          <article key={part.id} className={`rate-slab ${part.tier}`}>
            <span className="rate-slab-head">{part.tier === 'peak' ? <Sun size={16}/> : <Cloud size={16}/>}<b>{shared.dayparts[part.id].label}</b><i>{shared.dayparts[part.id].window}</i></span>
            <strong className="money">{cents.format(rateFor('banner', part.id))}<small> {t.packages.perMin}</small></strong>
            <span className="rate-slab-foot">{t.packages.slabFoot(shared.tier[part.tier], count.format(weeklyMinutes(SHOP, part.id)))}</span>
          </article>
        ))}
      </div>

      <div className="tier-grid">{FORMATS.map(format => {
        const look = LOOK[format.id];
        const words = t.packages.look[format.id];
        const perPlay = unitOf(format.id) === 'play';
        return <article key={format.id} className={`tier ${look.tone}`}>
          <div className="tier-icon">{look.icon}</div>
          <h3>{shared.formats[format.id].name}</h3>
          <p>{words.sell}</p>
          <div className="tier-price">
            <b className="money">{cents.format(rateFor(format.id, 'lunch'))}</b>
            <span>{t.packages.peakPer(perPlay ? shared.unit.play : shared.unit.minute)}</span>
            <span className="tier-off">{t.packages.offPeak(cents.format(rateFor(format.id, 'afternoon')))}</span>
          </div>
          <ul>
            <li><Check size={15}/>{words.note}</li>
            <li><Check size={15}/>{shared.formats[format.id].spec}</li>
            <li><Check size={15}/>{perPlay ? t.packages.payPlays : t.packages.payMinutes}</li>
          </ul>
          <Link href="/dashboard" data-track="adv-tier-build">{t.packages.buildOne} <ArrowRight size={15}/></Link>
        </article>;
      })}</div>

      <p className="packages-foot">{t.packages.foot}</p>
    </div></section>

    <section id="reporting" className="reporting-band"><div className="wrap">
      <div className="section-head"><span className="eyebrow light">{t.reporting.eyebrow}</span><h2>{t.reporting.title}</h2><p>{t.reporting.ledeBefore}<Link href="/dashboard">{t.reporting.ledeLink}</Link>{t.reporting.ledeAfter}</p></div>
      <DashboardReel/>
      <p className="tour-foot">{t.reporting.foot}</p>
    </div></section>

    <section id="advertise" className="advertise wrap"><SkyShapes /><div className="advertise-copy"><span className="eyebrow">{t.advertise.eyebrow}</span><h2>{t.advertise.title}</h2><p>{t.advertise.lede}</p></div><AdvertiseForm/></section>

    <SiteFooter links={[
      { href: '/', label: shared.nav.forShops },
      { href: '/about', label: shared.nav.about },
      { href: '/faq', label: shared.nav.faq },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
