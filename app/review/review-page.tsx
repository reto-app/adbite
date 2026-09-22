'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Link } from '@/components/nav';
import { Wordmark } from '@/components/brand';
import { LangSwitch } from '@/components/lang-switch';
import { useCopy } from '@/lib/lang';
import { REVIEW } from '@/lib/copy/review';

/* Deciding on an ad without signing in first.
 *
 * The approval mail carries a secret minted for one approval row, and this
 * page spends it. Two links in that mail land here: `?t=…` on its own, and
 * `?t=…&approve=1`, which only decides which button is under the thumb. The
 * answer is always a POST the person makes from this page, never the act of
 * opening it -- mail scanners follow links, and an approval that a security
 * gateway can trigger is not an approval. api/queue/review.ts says more.
 *
 * The secret stays in the URL after load rather than being scrubbed, so a
 * refresh still works and the owner can hand the link to whoever actually
 * decides. It does not leak to the asset host with the artwork: the
 * Referrer-Policy in vercel.json sends the origin alone across origins.
 *
 * Everything is fetched on the client. The route prerenders to a shell so it
 * can be a static file like the rest of the site, which also means no server
 * of ours ever renders a page with the secret baked into it. */

const LINK_DAYS = 30;

type Booking = {
  shopName: string;
  campaignName: string;
  advertiserName: string | null;
  advertiserSite: string | null;
  note: string | null;
  format: string;
  creativeKind: string | null;
  creativeSrc: string | null;
  weeklyEarnings: number;
};

type Gone = 'unknown' | 'expired' | 'decided' | 'offline';

type State =
  | { phase: 'loading' }
  | { phase: 'gone'; reason: Gone }
  | { phase: 'ready'; booking: Booking }
  | { phase: 'deciding'; booking: Booking }
  | { phase: 'done'; booking: Booking; approved: boolean };

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function ReviewPage() {
  const t = useCopy(REVIEW);
  /* `loading` through the first paint, so the hydrated page matches the
     prerendered shell. The URL is read in the effect for the same reason:
     there is no query string at build time. */
  const [state, setState] = useState<State>({ phase: 'loading' });
  const token = useRef('');
  /* Which button to lead with. A ref rather than state because it is fixed by
     the URL before the first fetch resolves and can never change afterwards;
     as state it would only be a second render nobody sees. */
  const leadWithYes = useRef(false);
  const yesButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      token.current = params.get('t') ?? '';
      leadWithYes.current = params.get('approve') === '1';

      if (!token.current) {
        if (live) setState({ phase: 'gone', reason: 'unknown' });
        return;
      }
      try {
        const response = await fetch(`/api/queue/review?t=${encodeURIComponent(token.current)}`);
        if (!live) return;
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { reason?: Gone };
          setState({ phase: 'gone', reason: body.reason ?? 'offline' });
          return;
        }
        setState({ phase: 'ready', booking: (await response.json()) as Booking });
      } catch {
        if (live) setState({ phase: 'gone', reason: 'offline' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  /* The mail's Approve link leads here with the yes already under the thumb.
     Focusing it is as far as that goes: the person still presses it, and they
     are looking at the artwork when they do. */
  useEffect(() => {
    if (state.phase === 'ready' && leadWithYes.current) yesButton.current?.focus();
  }, [state.phase]);

  const decide = useCallback(
    async (approved: boolean) => {
      setState((current) =>
        current.phase === 'ready' ? { phase: 'deciding', booking: current.booking } : current,
      );
      try {
        const response = await fetch('/api/queue/review', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: token.current, approved }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { reason?: Gone };
          setState({ phase: 'gone', reason: body.reason ?? 'offline' });
          return;
        }
        setState((current) =>
          current.phase === 'deciding'
            ? { phase: 'done', booking: current.booking, approved }
            : current,
        );
      } catch {
        /* Nothing was written, so the honest thing is to put the buttons
           back rather than claim an answer went through. */
        setState((current) =>
          current.phase === 'deciding' ? { phase: 'ready', booking: current.booking } : current,
        );
      }
    },
    [],
  );

  return (
    <main className="review">
      <header className="review-top">
        <Link href="/" aria-label="AdBite">
          <Wordmark />
        </Link>
        <LangSwitch />
      </header>

      <div className="review-card">
        {state.phase === 'loading' && <p className="review-wait">{t.deciding}</p>}

        {state.phase === 'gone' && (
          <>
            <h1>{t.gone[state.reason].title}</h1>
            <p className="review-lede">
              {state.reason === 'expired'
                ? t.gone.expired.text(LINK_DAYS)
                : (t.gone[state.reason] as { text: string }).text}
            </p>
            <Link className="button invert review-out" href="/dashboard">
              {t.dashboard} <ArrowRight size={16} />
            </Link>
          </>
        )}

        {(state.phase === 'ready' || state.phase === 'deciding') && (
          <>
            <h1>{t.title}</h1>
            <p className="review-lede">{t.lede(state.booking.shopName)}</p>

            <dl className="review-facts">
              <div>
                <dt>{t.ad}</dt>
                <dd>{state.booking.campaignName}</dd>
              </div>
              <div>
                <dt>{t.from}</dt>
                {/* A name and a website, never an address. A shop is deciding
                    whether to put a business on its wall, not who to mail. */}
                <dd>
                  {state.booking.advertiserName || t.anAdvertiser}
                  {state.booking.advertiserSite && (
                    <a
                      className="queue-site"
                      href={state.booking.advertiserSite}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {state.booking.advertiserSite.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </dd>
              </div>
              <div>
                <dt>{t.format}</dt>
                <dd>{state.booking.format}</dd>
              </div>
              <div>
                <dt>{t.pays}</dt>
                <dd>{t.paysValue(money(state.booking.weeklyEarnings))}</dd>
              </div>
            </dl>

            {state.booking.note && <p className="queue-note">{state.booking.note}</p>}

            <div className="queue-art review-art">
              {state.booking.creativeSrc && state.booking.creativeKind === 'video' ? (
                <video src={state.booking.creativeSrc} muted loop autoPlay playsInline />
              ) : state.booking.creativeSrc ? (
                <img src={state.booking.creativeSrc} alt={state.booking.campaignName} />
              ) : (
                <span>{t.onFile}</span>
              )}
            </div>
            <p className="review-art-note">{t.artwork}</p>

            <div className="queue-actions review-actions">
              <button
                type="button"
                disabled={state.phase === 'deciding'}
                onClick={() => void decide(false)}
              >
                <X size={15} /> {t.reject}
              </button>
              <button
                ref={yesButton}
                type="button"
                className="yes"
                disabled={state.phase === 'deciding'}
                onClick={() => void decide(true)}
              >
                <Check size={15} /> {state.phase === 'deciding' ? t.deciding : t.approve}
              </button>
            </div>
            <p className="review-note">{t.note}</p>
          </>
        )}

        {state.phase === 'done' && (
          <>
            <span className={`review-tick${state.approved ? '' : ' no'}`}>
              {state.approved ? <Check size={22} /> : <X size={22} />}
            </span>
            <h1>{state.approved ? t.approved.title : t.rejected.title}</h1>
            <p className="review-lede">
              {state.approved ? t.approved.text(state.booking.shopName) : t.rejected.text}
            </p>
            <Link className="button invert review-out" href="/dashboard">
              {t.dashboard} <ArrowRight size={16} />
            </Link>
            <p className="review-note">{t.dashboardNote}</p>
          </>
        )}
      </div>
    </main>
  );
}
