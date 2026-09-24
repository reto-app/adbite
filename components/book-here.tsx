'use client';

import { useState } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { Link } from '@/components/nav';
import { Wordmark } from '@/components/brand';
import { LangSwitch } from '@/components/lang-switch';
import { signIn, useAccount } from '@/lib/account';
import { bookPath, rememberBook } from '@/lib/book-intent';
import { venueById } from '@/lib/network';
import { SPOT_QUARTERLY, SPOT_YEARLY, money } from '@/lib/pricing';
import { SUPPORT_MAIL, SUPPORT_MAILTO } from '@/lib/site';
import { useCopy } from '@/lib/lang';
import { BOOK } from '@/lib/copy/book';
import './book-here.css';

/* One shop's advertising page, where a printed QR code lands.
 *
 * The whole ask is an email address. The link it sends opens the builder
 * with this shop already chosen (lib/book-intent.ts), so the three steps
 * printed here are the three the person actually walks through: account,
 * upload, book. Somebody already signed in skips the form and goes straight
 * there.
 *
 * It stands on the review page's paper and card rather than the marketing
 * site's chrome, because it is read on a phone by someone who has never heard
 * of AdBite and only needs to know about the one screen. */

export function BookHere({ venueId }: { venueId: string }) {
  const t = useCopy(BOOK);
  const venue = venueById(venueId);
  const { ready, user } = useAccount();
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  /* The figure is a tap away rather than on the card: see lib/copy/book.ts.
     Once asked for it stays open, because somebody who wanted the number
     wants it again when they scroll back up. */
  const [priced, setPriced] = useState(false);

  if (!venue) return null;
  /* "Don Joaquín Street Tacos · Provo" is how the network lists it; the
     headline wants the name people say. */
  const shop = venue.name.split(' · ')[0];

  return (
    <main className="review book">
      <header className="review-top">
        <Link href="/" aria-label="AdBite">
          <Wordmark className="review-word" />
        </Link>
        <span className="book-top-end">
          {/* The mark is a link home too, but nobody arriving from a printed
              code knows that. This page is most people's first sight of
              AdBite, so the way out of it is spelled. */}
          <Link className="book-home" href="/">
            {t.home}
          </Link>
          <LangSwitch className="light" />
        </span>
      </header>

      <div className="review-card">
        {sent ? (
          <>
            <span className="review-tick">
              <Check size={22} />
            </span>
            <h1>{t.sent.title}</h1>
            <p className="review-lede">{t.sent.text(sent)}</p>
            <button type="button" className="book-again" onClick={() => setSent(null)}>
              {t.sent.again}
            </button>
          </>
        ) : (
          <>
            <span className="book-eyebrow">{venue.name}</span>
            <h1>{t.title(shop)}</h1>
            <p className="review-lede">{t.lede}</p>

            <dl className="review-facts">
              <div>
                <dt>{t.where}</dt>
                <dd>
                  {venue.street}, {venue.city.split(',')[0]}
                </dd>
              </div>
              <div>
                <dt>{t.open}</dt>
                <dd>{venue.hours}</dd>
              </div>
              {priced && (
                <div className="book-price-row">
                  <dt>{t.price}</dt>
                  <dd className="money">{t.priceValue(money.format(SPOT_QUARTERLY), money.format(SPOT_YEARLY))}</dd>
                </div>
              )}
            </dl>

            {!priced && (
              <button type="button" className="book-price-ask" onClick={() => setPriced(true)}>
                {t.priceShow}
              </button>
            )}

            <ol className="book-steps">
              {t.steps.map((step, index) => (
                <li key={step.title}>
                  <span className="book-step-n">{index + 1}</span>
                  <span>
                    <b>{step.title}</b>
                    <small>{step.text}</small>
                  </span>
                </li>
              ))}
            </ol>

            {ready && user ? (
              <>
                <p className="review-note">{t.signedIn(user.email)}</p>
                <Link className="button primary book-go" href={bookPath(venueId)} data-track="book-continue">
                  {t.continue} <ArrowRight size={17} />
                </Link>
              </>
            ) : (
              <form
                className="book-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
                  setSending(true);
                  setError('');
                  rememberBook(venueId);
                  const result = await signIn(email, bookPath(venueId));
                  setSending(false);
                  if (result.ok) setSent(email);
                  else setError(result.message);
                }}
              >
                <label className="send-field" htmlFor="book-email">
                  {t.email}
                  <span className="field">
                    <Mail size={16} />
                    <input
                      id="book-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      placeholder={t.emailPlaceholder}
                    />
                  </span>
                </label>
                <button className="button primary book-go" type="submit" disabled={sending} data-track="book-email">
                  {sending ? t.sending : t.send} <ArrowRight size={17} />
                </button>
                {error && (
                  <p className="form-warn" role="alert">
                    {error}
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </div>

      <p className="review-note">
        {t.trouble} <a href={SUPPORT_MAILTO}>{SUPPORT_MAIL}</a>
      </p>
    </main>
  );
}
