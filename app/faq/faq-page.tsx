'use client';

import { useState } from 'react';
import { Link } from '@/components/nav';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAIL, MAILTO } from '@/lib/site';
import { VENUES } from '@/lib/network';
import { VIDEO_HOURLY, money } from '@/lib/pricing';
import { useCopy } from '@/lib/lang';
import { FAQ } from '@/lib/copy/faq';
import { SHARED } from '@/lib/copy/shared';

const SHOP = VENUES[0];

/* The figures the answers quote, worked once. The words are in lib/copy/faq.ts
   and read these in, so a price changed in lib/pricing.ts moves through both
   languages at once. */
const FIGURES = {
  hours: SHOP.hours,
  videoHour: money.format(VIDEO_HOURLY),
  mail: MAIL,
};

export function FaqPage() {
  const t = useCopy(FAQ);
  const shared = useCopy(SHARED);
  const faqs = t.faqs(FIGURES);
  const [open, setOpen] = useState(0);
  return <main className="simple-page">
    <SiteHeader
      nav={[
        { href: '/shops', label: shared.nav.forShops },
        { href: '/', label: shared.nav.forAdvertisers },
        { href: '/about', label: shared.nav.about },
      ]}
      cta={{ href: '/shops#join', label: shared.header.joinWaitlist }}
    />

    <section className="faq-head wrap">
      <h1>{t.title}</h1>
      <p>{t.ledeBefore}<a href={MAILTO}>{MAIL}</a>{t.ledeAfter}</p>
    </section>

    <section className="faq-list wrap">
      {faqs.map(([q, a], i) => <article key={q}>
        <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{q}<ChevronDown className={open === i ? 'rotate' : ''}/></button>
        {open === i && <p>{a}</p>}
      </article>)}
    </section>

    <section className="simple-cta wrap">
      <Bite className="bite"/>
      <h2>{t.still}</h2>
      <div>
        <Link className="button invert" href="/shops#join">{t.talk} <ArrowRight size={16}/></Link>
        <Link className="button ghost" href="/">{t.advertise}</Link>
      </div>
    </section>

    <SiteFooter links={[
      { href: '/shops', label: shared.nav.forShops },
      { href: '/', label: shared.nav.forAdvertisers },
      { href: '/about', label: shared.nav.about },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
