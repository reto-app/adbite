'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from '@/components/nav';
import { Bite } from '@/components/brand';
import { BuyOptions } from '@/components/buy-options';
import { NORTH_PARK_NOODLE, ShopScene } from '@/components/shop-scene';
import { BoardReel } from '@/components/board-reel';
import { DashboardReel } from '@/components/dashboard-reel';
import { SkyShapes } from '@/components/sky-shapes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';
import { useCopy, useLang } from '@/lib/lang';
import { ADVERTISERS } from '@/lib/copy/advertisers';
import { SHARED } from '@/lib/copy/shared';
import { VIDEO_HOURLY, money } from '@/lib/pricing';

const AD_COLORS = ['coral', 'sun', 'blue'];

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

  return <main className="advertiser-page">
    <SiteHeader
      nav={[
        { href: '#flow', label: t.nav.buy },
        { href: '#reporting', label: t.nav.reporting },
        { href: '/faq', label: shared.nav.faq },
      ]}
      cta={{ href: '/dashboard', label: shared.header.buildCampaign }}
      aside={{ href: '/shops', label: shared.header.imAShopOwner }}
    />

    <div className="hero-band">
      <SkyShapes />
      <section className="ad-hero wrap">
        <div>
          <h1>{t.hero.title1}<em>{t.hero.title2}<Bite className="bite"/></em></h1>
          <p className="hero-lede">{t.hero.lede(money.format(VIDEO_HOURLY))}</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button primary" data-track="adv-hero-build">{t.hero.build} <ArrowRight size={17}/></Link>
            <a className="text-link" href="#advertise" data-track="adv-hero-contact">{t.hero.orContact}</a>
          </div>
          <p className="hero-foot">{t.hero.foot}</p>
        </div>
        <ShopScene ads={ads} activeAd={activeAd} onSelectAd={setActiveAd} shop={NORTH_PARK_NOODLE} />
      </section>
    </div>

    <BuyOptions />

    <section className="boards-section"><div className="wrap"><div className="section-head"><h2>{t.boards.title}</h2><p>{t.boards.lede}</p></div><BoardReel only={['rosas', 'spot']}/></div></section>

    <section id="reporting" className="reporting-band"><div className="wrap">
      <div className="section-head"><span className="eyebrow light">{t.reporting.eyebrow}</span><h2>{t.reporting.title}</h2><p>{t.reporting.ledeBefore}<Link href="/dashboard">{t.reporting.ledeLink}</Link>{t.reporting.ledeAfter}</p></div>
      <DashboardReel/>
      <p className="tour-foot">{t.reporting.foot}</p>
    </div></section>

    <section id="advertise" className="advertise wrap"><SkyShapes /><div className="advertise-copy"><span className="eyebrow">{t.advertise.eyebrow}</span><h2>{t.advertise.title}</h2><p>{t.advertise.lede}</p></div><AdvertiseForm/></section>

    <SiteFooter links={[
      { href: '/shops', label: shared.nav.forShops },
      { href: '/about', label: shared.nav.about },
      { href: '/faq', label: shared.nav.faq },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
