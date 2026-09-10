'use client';

import { Clock, MonitorPlay, Repeat2 } from 'lucide-react';
import { Bite } from '@/components/brand';

export const RATE_PER_MINUTE = 0.03;
export const SPOT_SECONDS = 15;
export const MIN_SPEND = 25;
export const MAX_SPEND = 1200;

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
/* the per-minute rate is cents, so it needs its own formatter */
const rate = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-US');

/* How a week's minutes actually land: shops are busier as the week goes on. */
const WEEK = [
  { day: 'M', weight: 0.12 },
  { day: 'T', weight: 0.13 },
  { day: 'W', weight: 0.13 },
  { day: 'T', weight: 0.14 },
  { day: 'F', weight: 0.17 },
  { day: 'S', weight: 0.16 },
  { day: 'S', weight: 0.15 },
];

const PRESETS = [
  { spend: 60, label: 'One block' },
  { spend: 150, label: 'A neighborhood' },
  { spend: 400, label: 'A few neighborhoods' },
  { spend: 900, label: 'The whole pilot' },
];

export function minutesFor(spend: number) {
  return Math.round(spend / RATE_PER_MINUTE);
}

function hoursLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${count.format(hours)} hr ${rest} min` : `${count.format(hours)} hr`;
}

export function SpendStep({
  spend,
  onChange,
}: {
  spend: number;
  onChange: (spend: number) => void;
}) {
  const minutes = minutesFor(spend);
  const plays = Math.round(minutes * (60 / SPOT_SECONDS));
  const fill = (spend - MIN_SPEND) / (MAX_SPEND - MIN_SPEND);

  return (
    <div className="spend-step">
      <div className="spend-hero">
        <Bite className="bite" />
        <span className="spend-eyebrow">Minutes your ad is on screen, each week</span>
        <strong className="spend-minutes">
          {count.format(minutes)}
          <span>min</span>
        </strong>
        <div className="spend-meter" aria-hidden="true">
          <i style={{ width: `${Math.max(2, fill * 100)}%` }} />
        </div>
        <div className="week-strip">
          <span className="week-strip-label">Minutes spread across the week</span>
          <div className="week-bars">
            {WEEK.map((entry, index) => (
              <span key={index}>
                <i style={{ height: `${(entry.weight / 0.17) * 100}%` }}>
                  <em>{count.format(Math.round(minutes * entry.weight))}</em>
                </i>
              </span>
            ))}
          </div>
          <div className="week-days">
            {WEEK.map((entry, index) => (
              <b key={index}>{entry.day}</b>
            ))}
          </div>
        </div>

        <div className="spend-money">
          <b>{money.format(spend)}</b>
          <span>per week · {rate.format(RATE_PER_MINUTE)} per minute shown</span>
        </div>
      </div>

      <div className="spend-controls">
        <label className="spend-slider">
          <span className="spend-slider-head">
            <b>Set your weekly spend</b>
            <em>{money.format(spend)}</em>
          </span>
          <input
            className="range-input"
            type="range"
            min={MIN_SPEND}
            max={MAX_SPEND}
            step={5}
            value={spend}
            onChange={(event) => onChange(Number(event.target.value))}
            style={{ '--fill': `${fill * 100}%` } as React.CSSProperties}
            aria-label="Weekly spend"
            aria-valuetext={`${money.format(spend)} per week, ${count.format(minutes)} minutes on screen`}
          />
          <span className="spend-scale">
            <i>{money.format(MIN_SPEND)}</i>
            <i>{money.format(MAX_SPEND)}</i>
          </span>
        </label>

        <div className="spend-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.spend}
              type="button"
              className={spend === preset.spend ? 'on' : undefined}
              onClick={() => onChange(preset.spend)}
            >
              <b>{money.format(preset.spend)}</b>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="spend-stats">
          <article>
            <Repeat2 size={18} />
            <strong>{count.format(plays)}</strong>
            <span>plays of a {SPOT_SECONDS}-second spot</span>
          </article>
          <article>
            <Clock size={18} />
            <strong>{hoursLabel(minutes)}</strong>
            <span>of screen time, every week</span>
          </article>
          <article>
            <MonitorPlay size={18} />
            <strong>{money.format(spend * 4.3)}</strong>
            <span>a month at this pace</span>
          </article>
        </div>

        <p className="spend-note">
          You only pay for minutes actually shown. Nothing runs until the shop owner approves your
          creative, and unspent minutes roll into the next week.
        </p>
      </div>
    </div>
  );
}
