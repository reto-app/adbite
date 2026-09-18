'use client';

import { Link } from '@/components/nav';
import { ArrowRight, Heart, Mail, MapPin, Store } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAIL, MAILTO } from '@/lib/site';
import { PILOT_CITY, VENUES } from '@/lib/network';
import { money, weeklyEarnings } from '@/lib/pricing';
import { useCopy } from '@/lib/lang';
import { PAGES } from '@/lib/copy/pages';
import { SHARED } from '@/lib/copy/shared';

const SHOP = VENUES[0];
const VALUE_ICONS = [<MapPin key="map" />, <Store key="store" />, <Heart key="heart" />];

const FIGURES = {
  city: PILOT_CITY,
  since: SHOP.since,
  shop: SHOP.name,
  street: SHOP.street,
  cityLine: SHOP.city,
  weekly: money.format(weeklyEarnings(SHOP)),
};

export function AboutPage() {
  const t = useCopy(PAGES).about;
  const shared = useCopy(SHARED);

  return <main className="simple-page">
    <SiteHeader
      nav={[
        { href: '/shops', label: shared.nav.forShops },
        { href: '/', label: shared.nav.forAdvertisers },
        { href: '/faq', label: shared.nav.faq },
      ]}
      cta={{ href: '/shops#join', label: shared.header.joinWaitlist }}
    />

    <section className="simple-hero wrap">
      <h1>{t.title}</h1>
      <p>{t.lede(PILOT_CITY)}</p>
    </section>

    <section className="values wrap">
      {t.values.map(([title, text], i) => (
        <article key={title}><span>{VALUE_ICONS[i]}</span><h3>{title}</h3><p>{text}</p></article>
      ))}
    </section>

    <section className="about-plain wrap">
      <h2>{t.where}</h2>
      <div className="about-facts">
        {t.facts(FIGURES).map(([dt, dd]) => (
          <div key={dt}>
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        ))}
      </div>
      <p className="about-note">{t.note}</p>
      <p className="about-contact">
        <Mail size={16}/> {t.contactBefore}<a href={MAILTO}>{MAIL}</a>{t.contactAfter}
      </p>
    </section>

    <section className="simple-cta wrap">
      <Bite className="bite"/>
      <h2>{t.ctaTitle}</h2>
      <div>
        <Link className="button invert" href="/shops#join">{t.joinShop} <ArrowRight size={16}/></Link>
        <Link className="button ghost" href="/">{t.reach}</Link>
      </div>
    </section>

    <SiteFooter links={[
      { href: '/shops', label: shared.nav.forShops },
      { href: '/', label: shared.nav.forAdvertisers },
      { href: '/faq', label: shared.nav.faq },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
