'use client';

import { useState } from 'react';
import { Link } from '@/components/nav';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { SkyShapes } from '@/components/sky-shapes';
import { MAIL, MAILTO } from '@/lib/site';
import { field, submitLead } from '@/lib/leads';

/* The advertiser invitation.
 *
 * This was a username and password form whose only valid credential was
 * hardcoded and never shown to anyone, so every advertiser who followed a CTA
 * hit a door that could not open. There is still no self-serve account: this
 * takes a request and mails info@adbite.site, where a person reads it. The copy
 * invites rather than gates, because a business reading this page is exactly
 * who we want on the network. */
function AccessForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (sent) {
    return (
      <div className="access-done">
        <span className="access-tick">
          <Check size={22} />
        </span>
        <h3>You&rsquo;re on the list.</h3>
        <p>
          We will find the nearest board to you and come back with what is open on it and what it
          would cost. A person writes back, not an auto-responder.
        </p>
        <Link className="button invert" href="/dashboard">
          Build your ad while you wait <ArrowRight size={16} />
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
          Your name
          <input id="access-name" name="name" required placeholder="Sam Ortega" />
        </label>
        <label htmlFor="access-business">
          Business
          <input id="access-business" name="business" required placeholder="Iron Rose Gym" />
        </label>
        <label htmlFor="access-where">
          Where you are
          <input id="access-where" name="where" required placeholder="Provo, Sandy, Logan…" />
        </label>
        <label htmlFor="access-email">
          Email
          <input
            id="access-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourbusiness.com"
          />
        </label>
        <label className="form-wide" htmlFor="access-about">
          What you would want to run
          <input
            id="access-about"
            name="about"
            placeholder="A banner for the lunch rush, two blocks north"
          />
        </label>
      </div>
      <button
        className="button primary"
        type="submit"
        data-track="access-request"
        disabled={sending}
      >
        {sending ? 'Sending…' : 'Get me on a board'} <ArrowRight size={17} />
      </button>
      {error && (
        <p className="form-warn" role="alert">
          {error} <a href={MAILTO}>Email us instead</a>.
        </p>
      )}
      <p className="form-note quiet">
        Goes straight to {MAIL}, where a person reads it. Nothing is charged and you are not
        committing to anything.
      </p>
    </form>
  );
}

export function SignInPage() {
  return (
    <main className="signin-page">
      <SkyShapes />
      <section className="signin-card">
        <div className="signin-brand">
          <Link href="/" aria-label="AdBite home">
            <Wordmark className="signin-word" />
          </Link>
          <span className="access-eyebrow">Ramping up volume</span>
          <h1>Target your city. Or just your neighborhood.</h1>
          <p>
            We are adding screens and bringing advertisers on every week. Tell us where you are and
            what you would run, and we will get you onto the boards closest to your customers.
          </p>
          <ul>
            <li>
              Pick the city, the neighborhood and the hours. Your ad runs on those boards and
              nowhere else
            </li>
            <li>
              No auction. The rate card is the rate, and it does not move because someone with a
              bigger budget turned up that week
            </li>
            <li>
              You pay for what actually ran, by the minute or by the play. An ad that never played
              is never billed
            </li>
          </ul>
          <p className="signin-mail">
            <Mail size={16} /> Would rather just write? <a href={MAILTO}>{MAIL}</a>
          </p>
        </div>
        <div className="signin-panel">
          <h2>Tell us where you are</h2>
          <AccessForm />
          <p className="signin-foot">
            Running a shop instead? <Link href="/#join">Join the shop waitlist</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
