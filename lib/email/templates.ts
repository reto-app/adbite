/* Every mail AdBite sends, as data. Layout renders them.
 *
 * Copy rules: say what happened in the first line, say what happens next,
 * name the shop or the campaign so the reader can place it, and never promise
 * a figure the product cannot back. Money and minutes come from the booking
 * itself, not from here. */

import { ORIGIN } from '../site.js';
import type { BankDetails } from '../server/bank.js';
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


/* ---- money, now that it moves by bank transfer ---------------------------
   Stripe is shelved, so nothing settles itself and nothing tells us it has.
   These three carry the whole cycle: what is owed and where to send it, a
   receipt when it lands, and a note to a shop saying what we have pushed.
   Every one of them leads on the number, because the number is what a person
   types into a bank form and what they search for six months later. */

export function invoiceIssued(facts: {
  number: string;
  amount: string;
  dueOn: string;
  lines: [string, string][];
  bank: BankDetails;
  /** Who it is addressed to. An invoice without this is a receipt for nobody. */
  billTo?: string[];
  note?: string;
}): Mail {
  return {
    subject: `Invoice ${facts.number} · ${facts.amount}`,
    preview: `Due ${facts.dueOn}. Pay by bank transfer.`,
    title: `Invoice ${facts.number}`,
    blocks: [
      {
        kind: 'lead',
        text: `${facts.amount} for what ran, due ${facts.dueOn}. Pay by bank transfer and quote ${facts.number} as the reference so we can match it.`,
      },
      ...(facts.billTo?.length
        ? [{ kind: 'rows' as const, rows: [['Billed to', facts.billTo.join(', ')] as [string, string]] }]
        : []),
      { kind: 'rows', rows: facts.lines },
      {
        kind: 'rows',
        rows: [
          ['Pay to', facts.bank.accountName],
          ['Bank', facts.bank.bankName],
          ['Routing (ABA)', facts.bank.routingNumber],
          ['Account', facts.bank.accountNumber],
          ['Reference', facts.number],
          ['Amount', facts.amount],
          ['Due', facts.dueOn],
        ],
      },
      ...(facts.note ? [{ kind: 'p' as const, text: facts.note }] : []),
      {
        kind: 'quiet',
        text: 'We send a receipt the day it clears. Nothing stops running while an invoice is open; if one goes unpaid we write to you before anything comes off a screen.',
      },
    ],
    button: { label: 'See what it covers', href: DASHBOARD },
    reason: 'You have an active advertiser account on adbite.site and this covers what ran on it.',
  };
}

export function paymentReceived(facts: { number: string; amount: string; paidOn: string }): Mail {
  return {
    subject: `Receipt · ${facts.amount} received`,
    preview: `Invoice ${facts.number} is settled. Nothing else to do.`,
    title: 'Thank you, that is settled.',
    blocks: [
      {
        kind: 'lead',
        text: `We have ${facts.amount} against invoice ${facts.number}. Nothing else is owed on it.`,
      },
      {
        kind: 'rows',
        rows: [
          ['Invoice', facts.number],
          ['Amount', facts.amount],
          ['Received', facts.paidOn],
        ],
      },
      { kind: 'p', text: 'Keep this as your receipt. Your campaigns carry on exactly as they were.' },
    ],
    button: { label: 'Open your campaigns', href: DASHBOARD },
    reason: 'You paid an AdBite invoice. This is the receipt for it.',
  };
}

/** To a shop, when its share of a settled week is on its way. */
export function remittanceSent(facts: {
  number: string;
  shopName: string;
  amount: string;
  last4: string | null;
}): Mail {
  return {
    subject: `${facts.amount} on its way to ${facts.shopName}`,
    preview: facts.last4
      ? `Bank transfer to the account ending ${facts.last4}.`
      : 'We need your bank details before we can send it.',
    title: facts.last4 ? 'Your money is on its way.' : 'Your money is waiting on a bank account.',
    blocks: [
      {
        kind: 'lead',
        text: facts.last4
          ? `${facts.amount} is going out to the account ending ${facts.last4}. Bank transfers usually land in one to three working days.`
          : `${facts.amount} is yours and is sitting here until you tell us where to send it. Add your bank details on the dashboard and it goes out on the next run.`,
      },
      {
        kind: 'rows',
        rows: [
          ['Remittance', facts.number],
          ['Amount', facts.amount],
          ['To', facts.last4 ? `Account ending ${facts.last4}` : 'Not set yet'],
        ],
      },
      {
        kind: 'p',
        text: 'Your dashboard itemises it: which advertiser, which hours, and what each one paid.',
      },
    ],
    button: {
      label: facts.last4 ? 'See what it covers' : 'Add your bank details',
      href: DASHBOARD,
    },
    reason: `You run ${facts.shopName} on AdBite, and this is your share of what ran on your screen.`,
  };
}
