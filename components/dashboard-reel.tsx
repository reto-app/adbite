'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { Link } from '@/components/nav';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';

/* A tour of the advertiser dashboard, in its own screenshots.
 *
 * This section used to be a hand-drawn panel with three invented numbers in
 * it, because at the time there was no dashboard to photograph. There is one
 * now, so the page shows it rather than an artist's impression of it. The
 * frames are captured from the running product; SETUP.md says how to retake
 * them, and they have to be retaken when the dashboard changes, which is the
 * price of showing the real thing. */

/* The words for each frame are in lib/copy/campaign.ts under `tour.frames`,
   in this order. */
/* Five, not six. There was a frame of step 02 here and it cannot ship: what a
   permanent spot costs is settled in a conversation, so the builder quotes a
   price the public page deliberately does not, and a screenshot of that step
   would publish it anyway. The page says what there is to buy in its own words
   directly above this tour; the tour shows the parts that are safe to show. */
const FRAMES = [
  { id: 'place', src: '/shots/04-place.webp' },
  { id: 'make', src: '/shots/06-make.webp' },
  { id: 'overview', src: '/shots/01-overview.webp' },
  { id: 'where', src: '/shots/02-where.webp' },
  { id: 'when', src: '/shots/03-when.webp' },
];

const HOLD = 5200;

export function DashboardReel() {
  const t = useCopy(CAMPAIGN).tour;
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  /* Nudged on every manual jump so the progress bar restarts its run rather
     than carrying on from wherever the old one had got to. */
  const [run, setRun] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced.current) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setAt((current) => (current + 1) % FRAMES.length);
      setRun((n) => n + 1);
    }, HOLD);
    return () => window.clearTimeout(timer);
  }, [at, playing, run]);

  const frame = t.frames[at];

  const jump = (index: number) => {
    setAt(index);
    setRun((n) => n + 1);
  };

  return (
    <div className="tour">
      <div className="tour-tabs" role="tablist" aria-label={t.label}>
        {FRAMES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === at}
            className={index === at ? 'on' : undefined}
            onClick={() => jump(index)}
          >
            <span>{t.frames[index].tab}</span>
            {index === at && playing && (
              <i className="tour-run" key={run} style={{ animationDuration: `${HOLD}ms` }} />
            )}
          </button>
        ))}
        <button
          type="button"
          className="tour-play"
          onClick={() => setPlaying((on) => !on)}
          aria-label={playing ? t.pause : t.play}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      <figure className="tour-frame">
        <div className="tour-screen">
          {FRAMES.map((item, index) => (
            <img
              key={item.id}
              src={item.src}
              alt={`${t.frames[index].tab}: ${t.frames[index].title}`}
              width={1360}
              height={850}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={index === at ? 'on' : undefined}
              aria-hidden={index !== at}
            />
          ))}
        </div>
        <figcaption>
          <b>{frame.title}</b>
          <span>{frame.note}</span>
          <Link className="tour-cta" href="/dashboard" data-track="tour-open-dashboard">
            {t.open} <ArrowRight size={15} />
          </Link>
        </figcaption>
      </figure>
    </div>
  );
}
