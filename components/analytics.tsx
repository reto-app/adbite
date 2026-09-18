'use client';

import { useEffect } from 'react';
import { Analytics as VercelAnalytics, track as vercelTrack } from '@vercel/analytics/react';

/* Page views and a handful of intentional events, so the site can be reasoned
   about instead of guessed at. There was no instrumentation of any kind before
   this, which meant nobody could tell whether visitors reached the join form,
   which of the nine homepage sections lost them, or whether the advertiser
   page converted at all.
 *
 * Two reporters, one call site. Vercel Web Analytics is always on and needs no
 * configuration, because the site is deployed there. The self-hosted tag is
 * optional: point NEXT_PUBLIC_ANALYTICS_SRC at a Plausible, Fathom or Umami
 * script and it starts reporting alongside, and with nothing set it stays
 * quiet rather than shipping a broken tag.
 *
 * Cookieless and aggregate on purpose: no profiles, no cross-site tracking,
 * which is what the privacy page promises.
 *
 * Any element can report a click by carrying data-track="some-name", and it
 * reaches both reporters. Navigation is a real document load (see
 * components/nav.tsx), so page views need no route wiring on either side. */

const SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
const SITE = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

/** Report a named event to both. Safe to call whether or not either loaded. */
export function track(event: string, props?: Record<string, string>) {
  try {
    vercelTrack(event, props);
  } catch {
    /* never let a metric break a form submit */
  }
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    /* as above */
  }
}

export function Analytics() {
  useEffect(() => {
    if (SRC && !document.querySelector('script[data-analytics]')) {
      const tag = document.createElement('script');
      tag.src = SRC;
      tag.defer = true;
      tag.dataset.analytics = 'true';
      if (SITE) tag.dataset.domain = SITE;
      document.head.appendChild(tag);
    }

    /* One listener for the whole document beats wiring a handler onto every
       button, and it keeps the tracking out of the components themselves. */
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('[data-track]');
      const name = target?.getAttribute('data-track');
      if (name) track(name);
    };

    document.addEventListener('click', onClick);

    /* ---- did anyone actually read it ----------------------------------
       Vercel counts a bounce as a session with one page view, and this site
       is two long scrolling documents with in-page anchors. Somebody who
       lands on the home page, reads all of it and submits the waitlist form
       fires exactly one page view, so the bounce rate counts our best
       visitor as a failure and there is no way to configure that away.

       So measure the thing the bounce rate is standing in for: fire once per
       page view, on whichever comes first -- half the page scrolled, or
       twenty seconds. `engaged` against page views for the same window is
       the number the bounce rate was supposed to be. A page shorter than the
       window has nothing to scroll, which is why the timer is not merely a
       backstop. */
    let engaged = false;
    const reached = () => {
      if (engaged) return;
      engaged = true;
      track('engaged', { path: window.location.pathname });
      stop();
    };

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      /* Nothing to scroll: the timer owns this page. */
      if (scrollable < 200) return;
      if (window.scrollY / scrollable >= 0.5) reached();
    };

    const timer = window.setTimeout(reached, 20_000);
    function stop() {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('click', onClick);
      stop();
    };
  }, []);

  return <VercelAnalytics />;
}
