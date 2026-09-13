'use client';

import { Clock, Cloud, MonitorPlay, Repeat2, Sun } from 'lucide-react';
import { Bite } from '@/components/brand';
import { VENUES } from '@/lib/network';
import { FORMATS, type FormatId } from '@/lib/boards';
import {
  DAYPARTS,
  blendedRate,
  cents,
  count,
  hoursLabel,
  inventory,
  maxSpend,
  minutesFor,
  money,
  perMinuteRate,
  playsFor,
  rateFor,
  unitOf,
  weeklyMinutes,
  type Daypart,
} from '@/lib/pricing';

export const MIN_SPEND = 25;

/* Presets are daypart shapes, not geography. With one shop on the network
   "a few neighborhoods" was selling something that did not exist; when to run
   is the choice an advertiser actually has. */
const PRESETS: { label: string; note: string; dayparts: Daypart[] }[] = [
  { label: 'Afternoons', note: 'Cheapest minutes', dayparts: ['afternoon'] },
  { label: 'Lunch rush', note: 'Peak, 11am-2pm', dayparts: ['lunch'] },
  { label: 'Dinner rush', note: 'Peak, 5pm-9pm', dayparts: ['evening'] },
  { label: 'Every open hour', note: 'The whole week', dayparts: ['lunch', 'afternoon', 'evening'] },
];

const ALL: Daypart[] = DAYPARTS.map((part) => part.id);

/* The shop is shut on Sunday, and nothing here measures footfall, so the week
   splits evenly across the days it is actually open. */
const WEEK = [
  { day: 'M', open: true },
  { day: 'T', open: true },
  { day: 'W', open: true },
  { day: 'T', open: true },
  { day: 'F', open: true },
  { day: 'S', open: true },
  { day: 'S', open: false },
];

export function SpendStep({
  spend,
  onChange,
  dayparts,
  onDayparts,
  format,
  onFormat,
}: {
  spend: number;
  onChange: (spend: number) => void;
  dayparts: Daypart[];
  onDayparts: (dayparts: Daypart[]) => void;
  format: FormatId;
  onFormat: (format: FormatId) => void;
}) {
  const chosen = dayparts.length ? dayparts : ALL;
  const ceiling = Math.max(MIN_SPEND + 5, maxSpend(VENUES, chosen, format));
  const capped = Math.min(spend, ceiling);
  const minutes = minutesFor(capped, VENUES, chosen, format);
  const plays = playsFor(capped, VENUES, chosen, format);
  const rate = blendedRate(VENUES, chosen, format);
  const fill = (capped - MIN_SPEND) / Math.max(1, ceiling - MIN_SPEND);
  const openDays = WEEK.filter((entry) => entry.open).length;
  const sold = inventory(VENUES, chosen, format);
  const full = capped >= ceiling;
  const byPlay = unitOf(format) === 'play';

  const toggle = (id: Daypart) => {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id];
    onDayparts(next.length ? next : ALL);
  };

  /* Both levers move the price, so changing either has to pull the spend back
     under whatever is still buyable. */
  const reprice = (nextDayparts: Daypart[], nextFormat: FormatId) => {
    onChange(Math.min(spend, maxSpend(VENUES, nextDayparts, nextFormat)));
  };

  return (
    <div className="spend-step">
      <div className="spend-hero">
        <Bite className="bite" />
        <span className="spend-eyebrow">
          {byPlay ? 'Times your ad plays, each week' : 'Minutes your ad is on screen, each week'}
        </span>
        <strong className="spend-minutes">
          {count.format(byPlay ? plays : minutes)}
          <span>{byPlay ? 'plays' : 'min'}</span>
        </strong>
        <div className="spend-meter" aria-hidden="true">
          <i style={{ width: `${Math.max(2, fill * 100)}%` }} />
        </div>

        {/* Nothing here measures footfall, so the week lands evenly on the days
            the shop opens. An even split makes a bar chart a picture of
            nothing, so this is a row of days rather than a fake distribution. */}
        <div className="week-strip">
          <span className="week-strip-label">
            {byPlay ? 'Plays' : 'Minutes'} a day, across the week
          </span>
          <div className="week-row">
            {WEEK.map((entry, index) => (
              <span key={index} className={entry.open ? 'day' : 'day shut'}>
                <b>{entry.day}</b>
                <i>
                  {entry.open
                    ? count.format(Math.round((byPlay ? plays : minutes) / openDays))
                    : 'shut'}
                </i>
              </span>
            ))}
          </div>
        </div>

        <div className="spend-money">
          <b>{money.format(capped)}</b>
          <span>
            per week · {cents.format(byPlay ? rate / 4 : rate)} a {byPlay ? 'play' : 'minute'} on
            this mix
          </span>
        </div>
      </div>

      <div className="spend-controls">
        <section className="rate-card">
          <div className="prefs-head">
            <h3>What shape is your ad</h3>
            <span className="prefs-hint">The more of the board it takes, the more it costs.</span>
          </div>
          <div className="rate-rows">
            {FORMATS.map((item) => {
              const on = format === item.id;
              const perPlay = unitOf(item.id) === 'play';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`rate-row${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    onFormat(item.id);
                    reprice(chosen, item.id);
                  }}
                >
                  <span className="rate-when">
                    <span
                      className="format-chip"
                      aria-hidden="true"
                      style={
                        {
                          '--l': item.diagram.left,
                          '--t': item.diagram.top,
                          '--w': item.diagram.width,
                          '--h': item.diagram.height,
                        } as React.CSSProperties
                      }
                    />
                    <b>{item.name}</b>
                  </span>
                  <span className="rate-price money">
                    {cents.format(rateFor(item.id, 'lunch'))}
                    <small>/ {perPlay ? 'play' : 'min'}</small>
                  </span>
                  <span className="rate-stock">
                    {item.blurb}
                    {perPlay && ' Billed on plays, not minutes.'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="rate-foot">
            Prices shown are peak. Off-peak is about half. A short video is billed by the play
            because that is what you are buying: a count of fifteen-second runs, not a stretch of
            time.
          </p>
        </section>

        <section className="rate-card">
          <div className="prefs-head">
            <h3>When it runs</h3>
            <span className="prefs-hint">Peak costs more. Pick any mix.</span>
          </div>
          <div className="rate-rows">
            {DAYPARTS.map((part) => {
              const on = chosen.includes(part.id);
              return (
                <button
                  key={part.id}
                  type="button"
                  className={`rate-row${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    const next = on
                      ? chosen.filter((item) => item !== part.id)
                      : [...chosen, part.id];
                    const settled = next.length ? next : ALL;
                    toggle(part.id);
                    reprice(settled, format);
                  }}
                >
                  <span className="rate-when">
                    {part.tier === 'peak' ? <Sun size={15} /> : <Cloud size={15} />}
                    <b>{part.label}</b>
                    <i>{part.window}</i>
                  </span>
                  <span className={`rate-tier ${part.tier}`}>
                    {part.tier === 'peak' ? 'Peak' : 'Off-peak'}
                  </span>
                  <span className="rate-price money">
                    {cents.format(rateFor(format, part.id))}
                    <small>/ {byPlay ? 'play' : 'min'}</small>
                  </span>
                  <span className="rate-stock">
                    {count.format(
                      byPlay
                        ? Math.round(weeklyMinutes(VENUES[0], part.id) * 4)
                        : weeklyMinutes(VENUES[0], part.id),
                    )}{' '}
                    {byPlay ? 'plays' : 'min'} free
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <label className="spend-slider">
          <span className="spend-slider-head">
            <b>Set your weekly spend</b>
            <em className="money">{money.format(capped)}</em>
          </span>
          <input
            id="weekly-spend"
            className="range-input"
            type="range"
            min={MIN_SPEND}
            max={ceiling}
            step={1}
            value={capped}
            onChange={(event) => onChange(Number(event.target.value))}
            style={{ '--fill': `${fill * 100}%` } as React.CSSProperties}
            aria-label="Weekly spend"
            aria-valuetext={`${money.format(capped)} per week, ${count.format(byPlay ? plays : minutes)} ${byPlay ? 'plays' : 'minutes'}`}
          />
          <span className="spend-scale">
            <i>{money.format(MIN_SPEND)}</i>
            <i>{money.format(ceiling)} buys every {byPlay ? 'play' : 'minute'}</i>
          </span>
        </label>

        {full && (
          <p className="spend-full">
            That is the whole of this shop&rsquo;s ad time for the week in this format. There is
            nothing more to sell until another screen joins.
          </p>
        )}

        <div className="spend-presets">
          {PRESETS.map((preset) => {
            const on =
              preset.dayparts.length === chosen.length &&
              preset.dayparts.every((id) => chosen.includes(id));
            return (
              <button
                key={preset.label}
                type="button"
                className={on ? 'on' : undefined}
                onClick={() => {
                  onDayparts(preset.dayparts);
                  reprice(preset.dayparts, format);
                }}
              >
                <b>{preset.label}</b>
                <span>{preset.note}</span>
              </button>
            );
          })}
        </div>

        <div className="spend-stats">
          <article>
            <Repeat2 size={18} />
            <strong>{count.format(plays)}</strong>
            <span>plays of a 15-second spot</span>
          </article>
          <article>
            <Clock size={18} />
            <strong>{hoursLabel(minutes)}</strong>
            <span>of screen time, every week</span>
          </article>
          <article>
            <MonitorPlay size={18} />
            <strong className="money">{money.format(capped * (52 / 12))}</strong>
            <span>a month at this pace</span>
          </article>
        </div>

        <p className="spend-note">
          You only pay for {byPlay ? 'plays that actually ran' : 'minutes actually shown'}. Nothing
          runs until the shop owner approves your creative, and anything unspent rolls into the next
          week. This mix holds {count.format(byPlay ? sold.plays : sold.minutes)}{' '}
          {byPlay ? 'plays' : 'minutes'}, worth {money.format(sold.value)} a week in total.
        </p>
      </div>
    </div>
  );
}

export { perMinuteRate };
