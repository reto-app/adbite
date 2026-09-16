/* Server-only Stripe client. Keeping this out of route files makes it much
   harder to accidentally pull the secret key into a browser bundle. */

import Stripe from 'stripe';

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  // This module is server-only.  Keep the API version explicit so a Stripe
  // Dashboard default cannot silently change an existing payment flow.
  return new Stripe(key, { apiVersion: '2026-08-26.dahlia' });
}

export function appOrigin() {
  const origin = process.env.APP_ORIGIN ?? 'https://adbite.site';
  return origin.replace(/\/$/, '');
}
