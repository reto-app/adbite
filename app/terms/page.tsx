import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAIL, MAILTO, ORIGIN } from '@/lib/site';
import { VENUES } from '@/lib/network';
import { cents, count, inventory, money, rateFor, weeklyCeiling, weeklyEarnings } from '@/lib/pricing';

export const metadata: Metadata = {
  title: { absolute: 'AdBite pilot terms · What each side is agreeing to' },
  description:
    'The plain commitments AdBite makes to shops and to advertisers during the pilot: approval rights, the revenue split, rates, and billing on minutes shown.',
  alternates: { canonical: `${ORIGIN}/terms` },
};

const SHOP = VENUES[0];

export default function TermsPage() {
  return <main className="simple-page legal-page">
    <SiteHeader nav={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/faq', label: 'FAQ' },
    ]}/>

    <section className="legal wrap">
      <h1>Pilot terms</h1>
      <p className="legal-date">Last updated September 2026. These are the commitments the site makes, written plainly. A signed agreement follows when a shop or an advertiser joins, and it will say the same things in more words.</p>

      <h2>If you run a shop</h2>
      <ul>
        <li>You approve every creative before it is scheduled. You can reject anything, for any reason, without explaining yourself.</li>
        <li>You set how much of the screen ads may use, up to about a third, and you can set it to nothing in any given week.</li>
        <li>You are paid from about {money.format(weeklyEarnings(SHOP))} a week on a board like the pilot one, rising toward {money.format(weeklyCeiling(SHOP))} in weeks when the larger ad formats sell. Your own opening hours and screen count change the figure.</li>
        <li>You are paid monthly, on what actually played, itemised by spot, so you can see which hours and formats earned.</li>
        <li>The board software, the screen monitoring, finding advertisers and collecting the money are all included. There is nothing to pay us and nothing deducted from your side.</li>
        <li>There is no contract term, no hardware to buy, and no exit fee. Tell us to stop and we stop.</li>
      </ul>

      <h2>If you buy ads</h2>
      <ul>
        <li>You buy screen time, not impressions. Price moves on two things: how much of the board your ad takes, and when it runs.</li>
        <li>A bottom banner starts at {cents.format(rateFor('banner', 'afternoon'))} a minute off-peak. A full-screen spot, which blanks the shop&rsquo;s menu for its turn, runs to {cents.format(rateFor('full', 'lunch'))} a minute at peak. A side rail sits between them.</li>
        <li>A short video is billed per play rather than per minute, from {cents.format(rateFor('video', 'afternoon'))} to {cents.format(rateFor('video', 'lunch'))} a play, because a count of runs is what you are buying and what we can count.</li>
        <li>Peak is lunch and dinner. The afternoon is about half the price of peak in every format.</li>
        <li>The shop owner can reject your creative. If they do, nothing runs and nothing is billed.</li>
        <li>You are billed only for what actually ran: minutes shown, or plays for a video. Anything booked that did not run rolls into the next week.</li>
        <li>Reporting is plays and on-screen minutes, split peak and off-peak. We do not report reach, impressions or any modelled figure, because we cannot measure them.</li>
        <li>There is no auction. The rate card is the rate, and it does not move because of who else booked that week.</li>
      </ul>

      <h2>What we do not promise</h2>
      <ul>
        <li>Any particular number of people seeing your ad. We sell time on a screen in a room, and we will not dress that up as an audience measurement.</li>
        <li>Targeting. Age and daypart preferences travel with a booking as a request. The shop runs one rotation for everyone in the room.</li>
        <li>Availability. At pilot scale there is one board, and it holds {count.format(inventory([SHOP]).minutes)} minutes of ad time a week. When it is full, it is full.</li>
      </ul>

      <p className="legal-foot">Questions about any of this go to <a href={MAILTO}>{MAIL}</a>, and we would rather answer them before you sign than after.</p>
    </section>

    <SiteFooter links={[
      { href: '/', label: 'For shops' },
      { href: '/advertisers', label: 'For advertisers' },
      { href: '/faq', label: 'FAQ' },
      { href: MAILTO, label: 'Contact' },
    ]}/>
  </main>;
}
