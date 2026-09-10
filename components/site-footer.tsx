import Link from 'next/link';
import { Bite, Wordmark } from './brand';

type FooterLink = { href: string; label: string };

export function SiteFooter({ links }: { links: FooterLink[] }) {
  return (
    <footer className="site-footer">
      <Bite className="bite" />
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Link href="/" aria-label="AdBite home">
            <Wordmark className="footer-word" />
          </Link>
          <p>Local ads on screens people already watch.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {links.map((link) =>
            link.href.startsWith('/') ? (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ),
          )}
        </nav>
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} AdBite</span>
        <span>Pilot stage. Screen shots on this page are concept mockups.</span>
      </div>
    </footer>
  );
}
