'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const faqs = [
  ['Does the shop owner approve every ad?', 'Yes. Shop owners see each creative before it is scheduled and can approve or reject it. Nothing runs without their okay.'],
  ['How much of the screen is advertising?', 'The starting model is around 20% ads and 80% shop content, but the exact share is agreed with each shop. Menus and essential shop content come first.'],
  ['Who sells the ads?', 'AdBite coordinates the local placements during the pilot. Shop owners do not need to manage sales conversations or chase payments.'],
  ['When do shops get paid?', 'We plan to offer weekly or monthly payments, with the timing confirmed when a shop joins the pilot.'],
  ['What kinds of ads can run?', 'Advertisers can book full-screen spots, short videos, or bottom banners that leave the menu visible. Every format is subject to owner approval.'],
  ['What do advertisers see in reporting?', 'A simple summary of plays each week and total minutes their ad was shown, along with the venues included in their package.'],
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);
  return <main className="simple-page">
    <SiteHeader
      nav={[
        { href: '/', label: 'For shops' },
        { href: '/advertisers', label: 'For advertisers' },
        { href: '/about', label: 'About' },
      ]}
      aside={{ href: '/advertisers', label: 'I’m an advertiser' }}
    />

    <section className="faq-head wrap">
      <h1>Friendly details. No fine-print feeling.</h1>
      <p>We’re building AdBite to be straightforward for both shops and advertisers.</p>
    </section>

    <section className="faq-list wrap">
      {faqs.map(([q, a], i) => <article key={q}>
        <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{q}<ChevronDown className={open === i ? 'rotate' : ''}/></button>
        {open === i && <p>{a}</p>}
      </article>)}
    </section>

    <section className="simple-cta wrap">
      <Bite className="bite"/>
      <h2>Still curious?</h2>
      <div>
        <Link className="button invert" href="/#join">Talk about your shop <ArrowRight size={16}/></Link>
        <a className="button ghost" href="mailto:hello@adbite.local">Email AdBite</a>
      </div>
    </section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/about', label: 'About' },
      { href: 'mailto:hello@adbite.local', label: 'Contact' },
    ]}/>
  </main>;
}
