import Link from 'next/link';
import { Wordmark } from './brand';

type NavItem = { href: string; label: string };

export function SiteHeader({
  nav,
  aside,
}: {
  nav: NavItem[];
  aside: { href: string; label: string };
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="AdBite home">
          <Wordmark className="brand-word" />
        </Link>
        <nav aria-label="Primary">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="audience-link" href={aside.href}>
          {aside.label}
        </Link>
      </div>
    </header>
  );
}
