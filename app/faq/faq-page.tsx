'use client';

import { useState } from 'react';
import { Link } from '@/components/nav';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAIL, MAILTO, SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';
import { VENUES } from '@/lib/network';
import { cents, money, rateFor, weeklyCeiling, weeklyEarnings } from '@/lib/pricing';

const SHOP = VENUES[0];

const faqs: [string, string][] = [
  ['What else does the screen do?', 'Quite a lot, and it is included. You can lay out and edit the menu itself in the browser and push it to the screen, play video of your own food, run your best Google and Yelp reviews between courses, and swap the whole board between breakfast, lunch and evening on a schedule. If you do not have a screen yet, we can supply one and install it.'],
  ['Who is this for?', 'Any independent shop with a screen people look at while they wait. Surf shops, retail and gift stores, grocery stores and corner markets, salons and barbershops, cafés, restaurants and taquerias, gyms, bike shops, laundromats. If there is a TV or a menu board above your counter, it qualifies.'],
  ['Does the shop owner approve every ad?', 'Yes. Shop owners see each creative before it is scheduled and can approve or reject it. Nothing runs without their okay.'],
  ['Where on the screen do the ads go?', 'Wherever you put them. In the board builder you pick the place, not a percentage: a strip along the bottom under your menu, a rail down the right third, a full turn between your boards, or nowhere at all in a week you want the whole screen. The rail is the usual choice and works out to about a third. Menus and essential shop content always come first.'],
  ['What does a shop actually earn?', `It depends on your opening hours, because you are selling screen time. A board open ${SHOP.hours} is paid from about ${money.format(weeklyEarnings(SHOP))} a week. That figure is a floor: it assumes every minute sells as the smallest ad format. Weeks where the bigger formats sell run higher, up to around ${money.format(weeklyCeiling(SHOP))}. A shop open seven days, or running two screens, earns proportionally more.`],
  ['Why do ads cost more at some times than others?', `Because attention is not evenly spread through the day. Lunch and dinner are peak: there is a queue, and people are reading the board while they decide. The quiet middle of the afternoon is about half the price. Shops earn more from their busy hours, and advertisers who are flexible pay less.`],
  ['Why do some ad formats cost more than others?', `Because they ask more of the room. A bottom banner leaves the whole menu readable, so it is the cheapest thing we sell, from ${cents.format(rateFor('banner', 'afternoon'))} a minute. A side rail takes the right third. A full-screen spot blanks the board for its turn, which is the most we ever ask of a shop and the most an advertiser pays, up to ${cents.format(rateFor('full', 'lunch'))} a minute at peak. A short video sits in that full-screen slot and is billed per play rather than per minute, from ${cents.format(rateFor('video', 'afternoon'))} a play.`],
  ['Why is video billed per play and not per minute?', `Because a count of plays is what an advertiser is actually buying, and it is the number we can stand behind. A fifteen-second spot either ran or it did not. Charging for a stretch of time would mean averaging across runs that may not have happened, and we would rather bill the thing we can count.`],
  ['Who sells the ads?', 'AdBite coordinates the local placements during the pilot. Shop owners do not need to manage sales conversations or chase payments.'],
  ['When do shops get paid?', 'Payments go out monthly, with the timing confirmed when a shop joins the pilot. You are paid on what actually played, itemised by spot, so you can see which hours and which formats earned.'],
  ['What if I am worried about my brand image?', 'You set the tone as much as the ads do. Tell us the kinds of businesses that fit your shop and we match placements to them, and any creative you would rather not run can be deferred or rejected outright, with no explanation owed. Plenty of shops go further and frame the screen as a point of pride: a small line reading “[your shop] supports local business” turns the ad slot into something your regulars read as generosity rather than advertising.'],
  ['What kinds of ads can run?', 'Four formats: a bottom banner that leaves the menu visible, a side rail down the right of a wide board, a full-screen spot for one turn of the rotation, and a short muted video in that same slot. Every format is subject to owner approval, and the ones that take more of the board cost the advertiser more.'],
  ['What do advertisers see in reporting?', 'How many times the ad played and the total minutes it was on screen, split between peak and off-peak, along with the venues included. No impressions, no reach estimates, no modelled numbers.'],
  ['Can I sign up right now?', `Yes. Sign in at the dashboard with your email and we send you a link; there is no password. AdBite is still running on a small number of screens across Salt Lake, Utah and Cache counties, so a booking is reviewed by the shop before it runs and a person at ${MAIL} is never far away. If a sign-in link does not arrive, write to ${SUPPORT_MAIL}.`],
];

export function FaqPage() {
  const [open, setOpen] = useState(0);
  return <main className="simple-page">
    <SiteHeader
      nav={[
        { href: '/', label: 'For shops' },
        { href: '/advertisers', label: 'For advertisers' },
        { href: '/about', label: 'About' },
      ]}
      cta={{ href: '/#join', label: 'Join the waitlist' }}
    />

    <section className="faq-head wrap">
      <h1>Friendly details. No fine-print feeling.</h1>
      <p>We’re building AdBite to be straightforward for both shops and advertisers. If something here is unclear, that is our problem, not yours: write to <a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a> and we will fix the wording.</p>
    </section>

    <section className="faq-list wrap">
      {faqs.map(([q, a], i) => <article key={q}>
        <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{q}<ChevronDown className={open === i ? 'rotate' : ''}/></button>
        {open === i && <p>{a}</p>}
      </article>)}
    </section>

    <section className="simple-cta wrap">
      <Bite className="bite"/>
      <h2>Still curious?</h2>
      <div>
        <Link className="button invert" href="/#join">Talk about your shop <ArrowRight size={16}/></Link>
        <a className="button ghost" href={MAILTO}>Email AdBite</a>
      </div>
    </section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/about', label: 'About' },
      { href: MAILTO, label: 'Contact' },
    ]}/>
  </main>;
}
