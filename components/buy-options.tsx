'use client';

import { ArrowRight, Check, Image as ImageIcon, Play } from 'lucide-react';
import { Link } from '@/components/nav';
import { MAILTO } from '@/lib/site';
import { VIDEO_HOURLY, money } from '@/lib/pricing';
import { useCopy } from '@/lib/lang';
import { ADVERTISERS } from '@/lib/copy/advertisers';

/* How it works, and the two things there are to buy.
 *
 * This replaced a six-node interactive flow that priced a week by the minute
 * across four formats. The pilot sells two lines instead: a place on one
 * screen for a year, and time by the hour. The numbers come from
 * lib/pricing.ts so the page and the product cannot drift apart. */

export function BuyOptions() {
  const t = useCopy(ADVERTISERS).buy;

  /* A permanent spot is quoted in a conversation rather than on the page:
     what it costs depends on which board, and which boards have one free
     changes week to week. Video is a flat number and can just be printed. */
  const options = [
    {
      ...t.banner,
      id: 'banner',
      icon: <ImageIcon size={19} />,
      price: t.banner.price,
      /* Not a number, so it is not set as one. */
      quoted: false,
      href: MAILTO,
    },
    {
      ...t.video,
      id: 'video',
      icon: <Play size={19} />,
      price: money.format(VIDEO_HOURLY),
      quoted: true,
      href: '/dashboard',
    },
  ];

  return (
    <section className="buy-section" id="flow">
      <div className="wrap">
        <div className="section-head">
          <h2>{t.title}</h2>
          <p>{t.lede}</p>
        </div>

        <div className="buy-grid">
          {options.map((option) => (
            <article className={`buy-card is-${option.id}`} key={option.id}>
              <span className="buy-eyebrow">
                {option.icon}
                {option.eyebrow}
              </span>
              <h3>{option.name}</h3>
              <p className={`buy-price${option.quoted ? '' : ' ask'}`}>
                <b className="money">{option.price}</b>
                <span>{option.per}</span>
              </p>
              <p className="buy-sell">{option.sell}</p>
              <ul>
                {option.points.map((point) => (
                  <li key={point}>
                    <Check size={15} /> {point}
                  </li>
                ))}
              </ul>
              {option.href.startsWith('mailto:') ? (
                <a className="buy-link" href={option.href} data-track={`buy-${option.id}`}>
                  {option.cta} <ArrowRight size={15} />
                </a>
              ) : (
                <Link className="buy-link" href={option.href} data-track={`buy-${option.id}`}>
                  {option.cta} <ArrowRight size={15} />
                </Link>
              )}
            </article>
          ))}
        </div>

        <ol className="buy-steps">
          {t.steps.map(([title, text], i) => (
            <li key={title}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <b>{title}</b>
              <small>{text}</small>
            </li>
          ))}
        </ol>

        <div className="buy-foot">
          <p>{t.foot}</p>
          <Link className="button primary" href="/dashboard" data-track="buy-build">
            {t.cta} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
