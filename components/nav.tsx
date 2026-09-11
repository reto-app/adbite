'use client';

/* Navigation for a statically hosted build.
 *
 * vinext's client router fetches an RSC payload per route, which only a vinext
 * server can produce. This site is exported as flat prerendered HTML, so a
 * router-driven click updates the URL and then leaves the previous page's
 * markup on screen. The runtime intercepts clicks on any anchor, not just
 * `next/link`, so the anchor has to claim the event itself and navigate the
 * document. Every route here is prerendered, so that is correct and fast.
 *
 * If this app is ever served by the vinext worker, swap these back for
 * `next/link`, `useRouter`, `useSearchParams` and `usePathname`. */

import type { AnchorHTMLAttributes, MouseEvent } from 'react';

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Link({ href, children, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        // Leave modified clicks and new-tab intents to the browser.
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function useNav() {
  return {
    push: (href: string) => window.location.assign(href),
    replace: (href: string) => window.location.replace(href),
  };
}

/** Matches `useSearchParams()` closely enough for the one caller that needs it. */
export function useQuery(): URLSearchParams {
  return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
}

export function usePath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}
