'use client';

/* "I came here to book this shop", carried across the magic link.
 *
 * A shop's advertising page sends the sign-in link back to
 * /dashboard?book=<venue>, and the dashboard opens the builder already pointed
 * at that shop. The query string is what survives when the link is opened in
 * a different browser from the one that asked for it, which on a phone is
 * most of the time (the mail app has its own). The copy in this browser's
 * storage covers the other case: somebody who signs in from the plain
 * /dashboard door after starting on the shop's page.
 *
 * It is spent once. The builder opening is the whole of what it means, and a
 * refresh after booking should not open a second one. */

import { venueById } from '@/lib/network';

const PARAM = 'book';
const KEY = 'adbite.book';

export function bookPath(venueId: string) {
  return `/dashboard?${PARAM}=${encodeURIComponent(venueId)}`;
}

export function rememberBook(venueId: string) {
  try {
    window.localStorage.setItem(KEY, venueId);
  } catch {
    /* the query string still carries it */
  }
}

/** The shop this visit came to book, if any, and only if it is a real one. */
export function readBook(): string | null {
  let venueId = new URLSearchParams(window.location.search).get(PARAM);
  if (!venueId) {
    try {
      venueId = window.localStorage.getItem(KEY);
    } catch {
      venueId = null;
    }
  }
  return venueId && venueById(venueId) ? venueId : null;
}

export function clearBook() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has(PARAM)) {
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, '', url);
  }
}
