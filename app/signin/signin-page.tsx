'use client';

import { useState } from 'react';
import { Link } from '@/components/nav';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { SkyShapes } from '@/components/sky-shapes';
import { MAIL, MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';
import { useCopy, useLang } from '@/lib/lang';
import { ADVERTISERS } from '@/lib/copy/advertisers';
import { SHARED } from '@/lib/copy/shared';
import { LangSwitch } from '@/components/lang-switch';

/* The advertiser invitation.
 *
 * This was a username and password form whose only valid credential was
 * hardcoded and never shown to anyone, so every advertiser who followed a CTA
 * hit a door that could not open. There is still no self-serve account: this
 * takes a request and mails info@adbite.site. The copy
 * invites rather than gates, because a business reading this page is exactly
 * who we want on the network. */
function AccessForm() {
  const t = useCopy(ADVERTISERS).signin;
  const shared = useCopy(SHARED);
  const { lang } = useLang();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (sent) {
    return (
      <div className="access-done">
        <span className="access-tick">
          <Check size={22} />
        </span>
        <h3>{t.done.title}</h3>
        <p>{t.done.text}</p>
        <Link className="button invert" href="/dashboard">
          {t.done.build} <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <form
      className="access-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSending(true);
        setError('');
        const result = await submitLead({
          kind: 'advertiser',
          email: field(data, 'email'),
          lang,
          detail: {
            request: 'advertiser onboarding',
            name: field(data, 'name'),
            business: field(data, 'business'),
            where: field(data, 'where'),
            about: field(data, 'about'),
          },
        });
        setSending(false);
        if (result.ok) setSent(true);
        else setError(result.message);
      }}
    >
      <div className="form-grid">
        <label htmlFor="access-name">
          {t.form.name}
          <input id="access-name" name="name" required placeholder={t.form.namePlaceholder} />
        </label>
        <label htmlFor="access-business">
          {t.form.business}
          <input id="access-business" name="business" required placeholder={t.form.businessPlaceholder} />
        </label>
        <label htmlFor="access-where">
          {t.form.where}
          <input id="access-where" name="where" required placeholder={t.form.wherePlaceholder} />
        </label>
        <label htmlFor="access-email">
          {t.form.email}
          <input
            id="access-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.form.emailPlaceholder}
          />
        </label>
        <label className="form-wide" htmlFor="access-about">
          {t.form.about}
          <input id="access-about" name="about" placeholder={t.form.aboutPlaceholder} />
        </label>
      </div>
      <button
        className="button primary"
        type="submit"
        data-track="access-request"
        disabled={sending}
      >
        {sending ? shared.form.sending : t.form.submit} <ArrowRight size={17} />
      </button>
      {error && (
        <p className="form-warn" role="alert">
          {error} <a href={MAILTO}>{shared.form.emailUsInstead}</a>.
        </p>
      )}
      <p className="form-note quiet">{t.form.note(MAIL)}</p>
    </form>
  );
}

export function SignInPage() {
  const t = useCopy(ADVERTISERS).signin;
  const shared = useCopy(SHARED);
  return (
    <main className="signin-page">
      <SkyShapes />
      <section className="signin-card">
        <div className="signin-brand">
          <div className="signin-top">
            <Link href="/" aria-label={shared.header.home}>
              <Wordmark className="signin-word" />
            </Link>
            {/* No site header on this page, so the switch rides with the mark. */}
            <LangSwitch />
          </div>
          <span className="access-eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.lede}</p>
          <ul>
            {t.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <p className="signin-mail">
            <Mail size={16} /> {t.ratherWrite} <a href={MAILTO}>{MAIL}</a>
          </p>
        </div>
        <div className="signin-panel">
          <h2>{t.panelTitle}</h2>
          <AccessForm />
          <p className="signin-foot">
            {t.runningAShop} <Link href="/shops#join">{t.joinShop}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
