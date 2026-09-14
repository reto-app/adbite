'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { Link } from '@/components/nav';

/* A tour of the advertiser dashboard, in its own screenshots.
 *
 * This section used to be a hand-drawn panel with three invented numbers in
 * it, because at the time there was no dashboard to photograph. There is one
 * now, so the page shows it rather than an artist's impression of it. The
 * frames are captured from the running product; SETUP.md says how to retake
 * them, and they have to be retaken when the dashboard changes, which is the
 * price of showing the real thing. */

const FRAMES = [
  {
    id: 'place',
    src: '/shots/04-place.webp',
    tab: 'Pick the shops',
    title: 'Pick the shops, or draw the block.',
    note: 'Search the network, take a whole neighbourhood in one press, or circle a radius around your own front door and take everything inside it.',
  },
  {
    id: 'price',
    src: '/shots/05-price.webp',
    tab: 'Price the week',
    title: 'See the week before you buy it.',
    note: 'Shape, hours and spend on one screen. Move any of the three and the minutes, the rate and the monthly figure all move with it.',
  },
  {
    id: 'make',
    src: '/shots/06-make.webp',
    tab: 'Drop the artwork',
    title: 'Your artwork, in the slot it will occupy.',
    note: 'Drop in a PNG and it appears on every board type that carries your format, at the size and position it will actually run.',
  },
  {
    id: 'overview',
    src: '/shots/01-overview.webp',
    tab: 'Watch it run',
    title: 'Then watch what it does.',
    note: 'Spend to date, minutes on screen, cost per play and cost per thousand heads, with a bar for every day since the board started playing it.',
  },
  {
    id: 'where',
    src: '/shots/02-where.webp',
    tab: 'Where it ran',
    title: 'Down to the screen.',
    note: 'Every shop it played on, how long it held each one, what that shop cost and what share of the week it took.',
  },
  {
    id: 'when',
    src: '/shots/03-when.webp',
    tab: 'When it ran',
    title: 'And down to the hour.',
    note: 'Which dayparts you bought, what each was charged at, and where the minutes landed across the shop day.',
  },
];

const HOLD = 5200;

export function DashboardReel() {
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

  const frame = FRAMES[at];

  const jump = (index: number) => {
    setAt(index);
    setRun((n) => n + 1);
  };

  return (
    <div className="tour">
      <div className="tour-tabs" role="tablist" aria-label="Dashboard tour">
        {FRAMES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === at}
            className={index === at ? 'on' : undefined}
            onClick={() => jump(index)}
          >
            <span>{item.tab}</span>
            {index === at && playing && (
              <i className="tour-run" key={run} style={{ animationDuration: `${HOLD}ms` }} />
            )}
          </button>
        ))}
        <button
          type="button"
          className="tour-play"
          onClick={() => setPlaying((on) => !on)}
          aria-label={playing ? 'Pause the tour' : 'Play the tour'}
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
              alt={`${item.tab}: ${item.title}`}
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
            Open it yourself <ArrowRight size={15} />
          </Link>
        </figcaption>
      </figure>
    </div>
  );
}
