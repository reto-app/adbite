'use client';

import { Clock, Cloud, MonitorPlay, Repeat2, Sun } from 'lucide-react';
import { Bite } from '@/components/brand';
import { LIVE_VENUES, type Venue } from '@/lib/network';
import { openOn } from '@/lib/delivery';
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

/* Presets are daypart shapes, not geography: where the ad runs is chosen in
   step 01 now, and when it runs is the lever that moves the price. */
const PRESETS: { label: string; note: string; dayparts: Daypart[] }[] = [
  { label: 'Afternoons', note: 'Cheapest minutes', dayparts: ['afternoon'] },
  { label: 'Lunch rush', note: 'Peak, 11am-2pm', dayparts: ['lunch'] },
  { label: 'Dinner rush', note: 'Peak, 5pm-9pm', dayparts: ['evening'] },
  { label: 'Every open hour', note: 'The whole week', dayparts: ['lunch', 'afternoon', 'evening'] },
];

const ALL: Daypart[] = DAYPARTS.map((part) => part.id);

/* Nothing here measures footfall, so a week splits evenly across the days the
   booked shops are actually open. The row starts on Monday; JS weekdays start
   on Sunday, hence the wrap. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const jsWeekday = (index: number) => (index === 6 ? 0 : index + 1);

export function SpendStep({
  spend,
  onChange,
  dayparts,
  onDayparts,
  format,
  onFormat,
  venues,
}: {
  spend: number;
  onChange: (spend: number) => void;
  dayparts: Daypart[];
  onDayparts: (dayparts: Daypart[]) => void;
  format: FormatId;
  onFormat: (format: FormatId) => void;
  /** The shops picked in step 01. Everything on this screen is priced on them. */
  venues: Venue[];
}) {
  const stock = venues.length ? venues : LIVE_VENUES;
  const chosen = dayparts.length ? dayparts : ALL;
  const ceiling = Math.max(MIN_SPEND + 5, maxSpend(stock, chosen, format));
  const capped = Math.min(spend, ceiling);
  const minutes = minutesFor(capped, stock, chosen, format);
  const plays = playsFor(capped, stock, chosen, format);
  const rate = blendedRate(stock, chosen, format);
  const fill = (capped - MIN_SPEND) / Math.max(1, ceiling - MIN_SPEND);
  const sold = inventory(stock, chosen, format);
  const full = capped >= ceiling;
  const byPlay = unitOf(format) === 'play';

  /* A shop that shuts on Sunday should not appear to bill for it, so a day
     counts only if some booked shop is open on it. */
  const openDay = (index: number) =>
    stock.some((venue) => openOn(venue, jsWeekday(index)));
  const openDays = WEEKDAYS.filter((_, index) => openDay(index)).length || 1;

  const toggle = (id: Daypart) => {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id];
    onDayparts(next.length ? next : ALL);
  };

  /* Both levers move the price, so changing either has to pull the spend back
     under whatever is still buyable. */
  const reprice = (nextDayparts: Daypart[], nextFormat: FormatId) => {
    onChange(Math.min(spend, maxSpend(stock, nextDayparts, nextFormat)));
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

        <div className="spend-money">
          <b>{money.format(capped)}</b>
          <span>
            per week · {cents.format(byPlay ? rate / 4 : rate)} a {byPlay ? 'play' : 'minute'} on
            this mix
          </span>
        </div>

        {/* An even split makes a bar chart a picture of nothing, so this is a
            row of days rather than a fake distribution. */}
        <div className="week-strip">
          <span className="week-strip-label">
            {byPlay ? 'Plays' : 'Minutes'} a day, across the week
          </span>
          <div className="week-row">
            {WEEKDAYS.map((letter, index) => (
              <span key={index} className={openDay(index) ? 'day' : 'day shut'}>
                <b>{letter}</b>
                <i>
                  {openDay(index)
                    ? count.format(Math.round((byPlay ? plays : minutes) / openDays))
                    : 'shut'}
                </i>
              </span>
            ))}
          </div>
        </div>

        <div className="spend-stats">
          <article>
            <Repeat2 size={16} />
            <strong>{count.format(plays)}</strong>
            <span>plays of a 0:15 spot</span>
          </article>
          <article>
            <Clock size={16} />
            <strong>{hoursLabel(minutes)}</strong>
            <span>of screen time a week</span>
          </article>
          <article>
            <MonitorPlay size={16} />
            <strong className="money">{money.format(capped * (52 / 12))}</strong>
            <span>a month at this pace</span>
          </article>
        </div>

        <p className="spend-note">
          You only pay for {byPlay ? 'plays that actually ran' : 'minutes actually shown'}. Your{' '}
          {stock.length} shop{stock.length === 1 ? '' : 's'} hold{stock.length === 1 ? 's' : ''}{' '}
          {count.format(byPlay ? sold.plays : sold.minutes)} {byPlay ? 'plays' : 'minutes'} in this
          mix, worth {money.format(sold.value)} a week in total.
        </p>
      </div>

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
          Prices shown are peak; off-peak is about half. A short video is billed by the play
          because that is what you are buying: a count of fifteen-second runs, not a stretch of
          time.
        </p>
      </section>

      <div className="spend-controls">
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
                      stock.reduce(
                        (total, venue) =>
                          total +
                          Math.round(weeklyMinutes(venue, part.id) * (byPlay ? 4 : 1)),
                        0,
                      ),
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
            That is the whole of these shops&rsquo; ad time for the week in this format. There is
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
      </div>
    </div>
  );
}

export { perMinuteRate };
