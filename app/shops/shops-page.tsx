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
  Star,
  Truck,
  X,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { BoardReel } from '@/components/board-reel';
import { BoardShowcase } from '@/components/board-showcase';
import { VenueScene } from '@/components/venue-scenes';
import { ShopScene } from '@/components/shop-scene';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Link } from '@/components/nav';
import { MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';
import { useCopy, useLang } from '@/lib/lang';
import { HOME } from '@/lib/copy/home';
import { SHARED } from '@/lib/copy/shared';


/* The businesses that buy a counter screen are the ones close enough to walk
   to. Every example on the site is one of those, and says so. The words are
   in lib/copy/home.ts; the colours belong to the scene. */
const AD_COLORS = ['coral', 'sun', 'blue'];

/* The screen is worth running even in a week when no ad sells, and this is the
   half of the product that makes that true. */
const TOOL_ICONS = [
  <LayoutTemplate size={22} key="design" />,
  <Clapperboard size={22} key="clip" />,
  <Star size={22} key="reviews" />,
  <CalendarClock size={22} key="hours" />,
];

function JoinForm() {
  const t = useCopy(HOME).join.form;
  const shared = useCopy(SHARED);
  const { lang } = useLang();
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
          lang,
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
        <label htmlFor="join-shop">{t.shop}
          <input id="join-shop" name="shop" required placeholder={t.shopPlaceholder} /></label>
        <label htmlFor="join-type">{t.type}
          <select id="join-type" name="type" defaultValue="">
            <option value="" disabled>{t.typePlaceholder}</option>
            {t.types.map((type) => <option key={type}>{type}</option>)}
          </select></label>
        <label htmlFor="join-city">{t.city}
          <input id="join-city" name="city" required placeholder={t.cityPlaceholder} /></label>
        <label htmlFor="join-screens">{t.screens}
          <select id="join-screens" name="screens" defaultValue="">
            <option value="" disabled>{t.screensPlaceholder}</option>
            {t.screenOptions.map((option) => <option key={option}>{option}</option>)}
          </select></label>
        <label className="form-wide" htmlFor="join-email">{t.email}
          <input id="join-email" name="email" type="email" required autoComplete="email"
            placeholder={t.emailPlaceholder} /></label>
      </div>
      <button className="button primary" type="submit" data-track="shop-waitlist-submit" disabled={sending || sent}>
        {sent ? t.onList : sending ? shared.form.sending : t.submit}
      </button>
      {sent && <p className="form-note"><Check size={16}/> {t.thanks}</p>}
      {error && <p className="form-warn" role="alert">{error} <a href={MAILTO}>{shared.form.emailUsInstead}</a>.</p>}
      {!sent && !error && <p className="form-note quiet">{t.quiet}</p>}
    </form>
  );
}

export function ShopsPage() {
  const t = useCopy(HOME);
  const shared = useCopy(SHARED);
  const ads = t.ads.map((ad, i) => ({ ...ad, color: AD_COLORS[i] }));
  const [activeAd, setActiveAd] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => setActiveAd(a => (a + 1) % ads.length), 3600);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  return <main>
    <SiteHeader
      nav={[
        { href: '#earnings', label: t.nav.earnings },
        { href: '#tools', label: t.nav.tools },
        { href: '/faq', label: shared.nav.faq },
      ]}
      cta={{ href: '#join', label: shared.header.joinWaitlist }}
      aside={{ href: '/', label: shared.header.imAnAdvertiser }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="hero wrap">
        <div className="hero-copy">
          <h1>{t.hero.title1}<br/><em>{t.hero.title2}<Bite className="bite"/></em></h1>
          <p className="hero-lede">{t.hero.lede}</p>
          <div className="hero-actions">
            <a className="button primary" href="#join" data-track="shop-hero-cta">{t.hero.cta} <ArrowRight size={17}/></a>
            <a className="text-link" href="#earnings" data-track="shop-hero-earnings">{t.hero.earnings}</a>
          </div>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} />
      </section>
    </div>

    <section id="how" className="section wrap touch-band">
      <div className="section-head"><h2>{t.how.title}</h2><p>{t.how.lede}</p></div>
      <a className="button primary" href="#join" data-track="shop-get-in-touch">{t.how.cta} <ArrowRight size={17}/></a>
    </section>

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>{t.formats.title}</h2><p>{t.formats.lede}</p></div><BoardReel only={['rosas', 'spot']}/></div></section>

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>{t.boards.title}</h2><p>{t.boards.lede}</p></div><BoardReel only={['roost', 'meridian']}/></div></section>

    <section className="approval wrap"><div className="approval-art"><div className="approval-card"><div className="review-head"><span className="review-tag">{t.approval.inReview}</span><span>{t.approval.queued}</span></div><div className="mini-ad"><div className="mini-brand"><i>RB</i><span>{t.approval.brand}<em>{t.approval.where}</em></span></div><b>{t.approval.headline}</b><p>{t.approval.body}</p><span className="mini-offer">{t.approval.offer}</span></div><dl className="review-details"><dt>{t.approval.format}</dt><dd>{t.approval.formatValue}</dd><dt>{t.approval.length}</dt><dd>{t.approval.lengthValue}</dd><dt>{t.approval.rotation}</dt><dd>{t.approval.rotationValue}</dd><dt>{t.approval.runs}</dt><dd>{t.approval.runsValue}</dd></dl><div className="approval-actions"><button type="button"><X size={16}/> {t.approval.reject}</button><button type="button"><Check size={16}/> {t.approval.approve}</button></div></div><div className="approval-badge"><BadgeCheck size={20}/><span><b>{t.approval.yourCall}</b>{t.approval.everyAd}</span></div></div><div className="approval-copy"><h2>{t.approval.title}</h2><p>{t.approval.lede}</p><ul>{t.approval.points.map((point) => <li key={point}><Check size={17}/> {point}</li>)}</ul></div></section>

    <section id="earnings" className="numbers-band"><div className="wrap figure-inner">
      <p className="big-figure">
        <span>{t.earnings.upTo}</span>
        <strong>{t.earnings.figure}</strong>
        <span>{t.earnings.per}</span>
      </p>
    </div></section>

    <section id="tools" className="levelup">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow light">{t.tools.eyebrow}</span>
          <h2>{t.tools.title}</h2>
          <p>{t.tools.lede}</p>
        </div>
        <BoardShowcase/>
        <div className="tool-grid">
          {t.tools.items.map(([title, text], i) => (
            <article className="tool" key={title}>
              <span>{TOOL_ICONS[i]}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <aside className="tv-offer">
          <span className="tv-icon"><Truck size={26}/></span>
          <div>
            <h3>{t.tools.tv.title}</h3>
            <p>{t.tools.tv.text}</p>
          </div>
          <a className="button invert" href="#join" data-track="tv-offer-cta">{t.tools.tv.cta} <ArrowRight size={16}/></a>
        </aside>
      </div>
    </section>

    <section className="venues wrap"><div className="section-head"><h2>{t.venues.title}</h2></div><div className="venue-copy"><article><VenueScene kind="restaurant"/><h3>{t.venues.restaurant[0]}</h3><p>{t.venues.restaurant[1]}</p></article><article><VenueScene kind="barber"/><h3>{t.venues.barber[0]}</h3><p>{t.venues.barber[1]}</p></article><article><VenueScene kind="salon"/><h3>{t.venues.salon[0]}</h3><p>{t.venues.salon[1]}</p></article><article><VenueScene kind="cafe"/><h3>{t.venues.cafe[0]}</h3><p>{t.venues.cafe[1]}</p></article></div></section>

    <section id="join" className="join wrap"><SkyShapes /><div className="join-copy"><span className="eyebrow">{t.join.eyebrow}</span><h2>{t.join.title}</h2><p>{t.join.lede}</p><div className="menu-designer"><MonitorPlay size={22}/><div><b>{t.join.thinking}</b><p>{t.join.thinkingBefore}<a href="#tools">{t.join.thinkingLink1}</a>{t.join.thinkingMiddle}<Link href="/dashboard">{t.join.thinkingLink2}</Link>{t.join.thinkingAfter}</p></div></div></div><JoinForm/></section>

    <SiteFooter links={[
      { href: '/about', label: shared.nav.about },
      { href: '/faq', label: shared.nav.faq },
      { href: '/', label: shared.nav.forAdvertisers },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
