'use client';

import { Link, usePath } from '@/components/nav';
import { AccountButton } from './account-button';
import { Wordmark } from './brand';

type NavItem = { href: string; label: string };

/* The header used to end at the audience switch and a sign-in link, so once
   the hero scrolled away there was nothing on screen to convert with. It now
   carries the page's primary action, and marks where you are. */
export function SiteHeader({
  nav,
  cta,
  aside,
}: {
  nav: NavItem[];
  cta?: { href: string; label: string };
  aside?: { href: string; label: string };
}) {
  const path = usePath();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="AdBite home">
          <Wordmark className="brand-word" />
        </Link>
        <nav aria-label="Primary">
          {nav.map((item) => {
            const here = item.href.startsWith('/') && item.href === path;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={here ? 'on' : undefined}
                aria-current={here ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          {aside && (
            <Link className="audience-link" href={aside.href}>
              {aside.label}
            </Link>
          )}
          {cta && (
            <Link className="header-cta" href={cta.href} data-track="header-cta">
              {cta.label}
            </Link>
          )}
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
