'use client';

import { Link } from '@/components/nav';
import { LINKEDIN, SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';
import { Bite, Wordmark } from './brand';

type FooterLink = { href: string; label: string };

/* Inline rather than in brand.tsx: that file is AdBite's own traced marks, and
   this is somebody else's. Lucide dropped its brand icons, so there is nothing
   to import. */
function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.25h4v11.5H3V9.25Zm6.5 0h3.83v1.57h.05a4.2 4.2 0 0 1 3.78-2.07c4.04 0 4.79 2.66 4.79 6.12v5.88h-4v-5.21c0-1.24-.02-2.84-1.73-2.84-1.73 0-2 1.35-2 2.75v5.3h-4V9.25Z" />
    </svg>
  );
}

export function SiteFooter({ links }: { links: FooterLink[] }) {
  const t = useCopy(SHARED);
  const render = (link: FooterLink) =>
    link.href.startsWith('/') ? (
      <Link key={link.href} href={link.href}>
        {link.label}
      </Link>
    ) : (
      <a key={link.href} href={link.href}>
        {link.label}
      </a>
    );

  return (
    <footer className="site-footer">
      <Bite className="bite" />
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Link href="/" aria-label={t.header.home}>
            <Wordmark className="footer-word" />
          </Link>
          <p>{t.footer.tagline}</p>
          <a
            className="footer-social"
            href={LINKEDIN}
            target="_blank"
            rel="noreferrer"
          >
            <LinkedInMark />
            LinkedIn
          </a>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {links.map(render)}
        </nav>
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} AdBite</span>
        <nav className="footer-legal" aria-label="Legal">
          <Link href="/privacy">{t.footer.privacy}</Link>
          <Link href="/terms">{t.footer.terms}</Link>
          <a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a>
        </nav>
        <span>{t.footer.stage}</span>
      </div>
    </footer>
  );
}
