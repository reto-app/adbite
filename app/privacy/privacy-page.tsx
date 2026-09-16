'use client';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MAILTO, SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';
import { useCopy } from '@/lib/lang';
import { PAGES } from '@/lib/copy/pages';
import { SHARED } from '@/lib/copy/shared';

/* Written from what the code actually does rather than from a template. If the
   forms, the analytics or the map tiles change, change lib/copy/pages.ts with
   them, in both languages. */
export function PrivacyPage() {
  const t = useCopy(PAGES).privacy;
  const shared = useCopy(SHARED);

  return <main className="simple-page legal-page">
    <SiteHeader nav={[
      { href: '/', label: shared.nav.forShops },
      { href: '/advertisers', label: shared.nav.forAdvertisers },
      { href: '/faq', label: shared.nav.faq },
    ]}/>

    <section className="legal wrap">
      <h1>{t.title}</h1>
      <p className="legal-date">{t.date}</p>

      {t.sections.map(([title, text]) => (
        <div key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      ))}

      <h2>{t.removeTitle}</h2>
      <p>{t.removeBefore}<a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a>{t.removeAfter}</p>
    </section>

    <SiteFooter links={[
      { href: '/', label: shared.nav.forShops },
      { href: '/advertisers', label: shared.nav.forAdvertisers },
      { href: '/faq', label: shared.nav.faq },
      { href: MAILTO, label: shared.nav.contact },
    ]}/>
  </main>;
}
