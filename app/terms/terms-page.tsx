'use client';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAIL, MAILTO } from '@/lib/site';
import { VENUES } from '@/lib/network';
import { cents, count, inventory, money, rateFor, weeklyCeiling, weeklyEarnings } from '@/lib/pricing';
import { useCopy } from '@/lib/lang';
import { PAGES } from '@/lib/copy/pages';
import { SHARED } from '@/lib/copy/shared';

const SHOP = VENUES[0];

const FIGURES = {
  weekly: money.format(weeklyEarnings(SHOP)),
  ceiling: money.format(weeklyCeiling(SHOP)),
  bannerOff: cents.format(rateFor('banner', 'afternoon')),
  fullPeak: cents.format(rateFor('full', 'lunch')),
  videoOff: cents.format(rateFor('video', 'afternoon')),
  videoPeak: cents.format(rateFor('video', 'lunch')),
  minutes: count.format(inventory([SHOP]).minutes),
};

export function TermsPage() {
  const t = useCopy(PAGES).terms;
  const shared = useCopy(SHARED);

  return <main className="simple-page legal-page">
    <SiteHeader nav={[
      { href: '/', label: shared.nav.forShops },
      { href: '/advertisers', label: shared.nav.forAdvertisers },
      { href: '/faq', label: shared.nav.faq },
    ]}/>

    <section className="legal wrap">
      <h1>{t.title}</h1>
      <p className="legal-date">{t.date}</p>

      <h2>{t.shopTitle}</h2>
      <ul>{t.shop(FIGURES).map((line) => <li key={line}>{line}</li>)}</ul>

      <h2>{t.adTitle}</h2>
      <ul>{t.ads(FIGURES).map((line) => <li key={line}>{line}</li>)}</ul>

      <h2>{t.notTitle}</h2>
      <ul>{t.not(FIGURES).map((line) => <li key={line}>{line}</li>)}</ul>

      <p className="legal-foot">{t.footBefore}<a href={MAILTO}>{MAIL}</a>{t.footAfter}</p>
    </section>

    <SiteFooter links={[
      { href: '/', label: shared.nav.forShops },
      { href: '/advertisers', label: shared.nav.forAdvertisers },
      { href: '/faq', label: shared.nav.faq },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
