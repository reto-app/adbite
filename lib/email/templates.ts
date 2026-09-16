/* Every mail AdBite sends, as data. Layout renders them.
 *
 * Copy rules: say what happened in the first line, say what happens next,
 * name the shop or the campaign so the reader can place it, and never promise
 * a figure the product cannot back. Money and minutes come from the booking
 * itself, not from here. */

import { ORIGIN } from '../site.js';
import type { Mail } from './layout.js';

const DASHBOARD = `${ORIGIN}/dashboard`;

/** Sent by Supabase Auth. The button link is substituted by the mailer. */
export function signInLink(): Mail {
  return {
    subject: 'Your AdBite sign-in link',
    preview: 'One click and you are in. Good for an hour.',
    title: 'Here is your sign-in link.',
    blocks: [
      { kind: 'p', text: 'Open it on the device you want to use and you land on your dashboard, signed in.' },
      { kind: 'quiet', text: 'The link works once and for an hour. If it has expired, ask for a new one from the dashboard.' },
    ],
    button: { label: 'Sign in to AdBite', href: DASHBOARD },
    reason: 'You are getting this because someone entered this address on adbite.site. If it was not you, ignore it; nothing happens without the click.',
  };
}

export type BookingFacts = {
  campaignName: string;
  format: string;
  venues: string[];
  dayparts: string[];
  weeklySpend: number;
  minutes: number;
};

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const list = (items: string[]) => (items.length ? items.join(', ') : 'Every live board');

/** To the advertiser, the moment a booking is placed. */
export function bookingReceived(facts: BookingFacts): Mail {
  return {
    subject: `Booked: ${facts.campaignName}`,
    preview: 'The shops it targets will look at it next.',
    title: 'Your booking is in.',
    blocks: [
      {
        kind: 'lead',
        text: 'Each shop you picked now sees it in their queue. Nothing runs and nothing is billed until a shop says yes.',
      },
      {
        kind: 'rows',
        rows: [
          ['Campaign', facts.campaignName],
          ['Format', facts.format],
          ['Boards', list(facts.venues)],
          ['When', list(facts.dayparts)],
          ['Weekly spend', `${money(facts.weeklySpend)} · about ${Math.round(facts.minutes)} minutes`],
        ],
      },
      { kind: 'p', text: 'You will get a mail the moment a shop decides. Most answer within a day.' },
    ],
    button: { label: 'Open your campaigns', href: DASHBOARD },
    reason: 'You booked this campaign on adbite.site.',
  };
}

/** To the shop owner, when a booking lands in their queue. */
export function approvalNeeded(facts: { shopName: string; advertiser: string; format: string; weeklyEarnings: number }): Mail {
  return {
    subject: `An ad is waiting for ${facts.shopName}`,
    preview: `${facts.advertiser} wants a spot on your board.`,
    title: 'An ad is waiting on you.',
    blocks: [
      {
        kind: 'lead',
        text: `${facts.advertiser} booked a ${facts.format.toLowerCase()} on your board. It does not run until you say so.`,
      },
      {
        kind: 'rows',
        rows: [
          ['Advertiser', facts.advertiser],
          ['Format', facts.format],
          ['Pays you', `about ${money(facts.weeklyEarnings)} a week while it runs`],
        ],
      },
      { kind: 'p', text: 'Open the queue to see the artwork exactly as it would appear on your screen, then approve it or turn it down. Either answer is fine; the advertiser hears back the same day.' },
    ],
    button: { label: 'Review the ad', href: DASHBOARD },
    reason: `You are getting this because you run ${facts.shopName} on AdBite and a booking named your board.`,
  };
}

/** To the advertiser, when a shop decides. */
export function campaignDecided(facts: { campaignName: string; shopName: string; approved: boolean }): Mail {
  if (facts.approved) {
    return {
      subject: `${facts.shopName} approved ${facts.campaignName}`,
      preview: 'It is on their screen within ten minutes.',
      title: `${facts.shopName} said yes.`,
      blocks: [
        { kind: 'lead', text: `${facts.campaignName} is on their board within ten minutes and runs in the hours you booked.` },
        { kind: 'p', text: 'Delivery shows up on your dashboard as it happens: plays for video, minutes for everything else. You are billed weekly on what actually ran.' },
      ],
      button: { label: 'See it running', href: DASHBOARD },
      reason: 'You booked this campaign on adbite.site.',
    };
  }
  return {
    subject: `${facts.shopName} passed on ${facts.campaignName}`,
    preview: 'Nothing was charged. Here is what you can do.',
    title: `${facts.shopName} passed on this one.`,
    blocks: [
      { kind: 'lead', text: `They chose not to run ${facts.campaignName}. Nothing ran and nothing was charged.` },
      { kind: 'p', text: 'Shops usually pass for one of two reasons: the artwork does not suit their board, or the category is one they keep off the wall. If you want to try again with different creative, or move the booking to other boards nearby, the campaign is still in your dashboard to copy.' },
    ],
    button: { label: 'Open your campaigns', href: DASHBOARD },
    reason: 'You booked this campaign on adbite.site.',
  };
}

/** To the advertiser when their saved payment method cannot settle a week. */
export function paymentFailed(): Mail {
  return {
    subject: 'Your AdBite payment needs attention',
    preview: 'Your affected campaigns have been paused.',
    title: 'We could not settle last week’s delivery.',
    blocks: [
      { kind: 'lead', text: 'The payment method on file did not complete the weekly charge, so the affected campaigns are paused and no new delivery will be billed.' },
      { kind: 'p', text: 'Open your dashboard to update your payment method. Once it is current, contact support to resume the campaign.' },
    ],
    button: { label: 'Open your dashboard', href: DASHBOARD },
    reason: 'You have an active advertiser account on adbite.site.',
  };
}
