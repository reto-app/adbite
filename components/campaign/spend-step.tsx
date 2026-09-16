'use client';

import { Clock, Cloud, MonitorPlay, Repeat2, Sun } from 'lucide-react';
import { Bite } from '@/components/brand';
import { LIVE_VENUES, type Venue } from '@/lib/network';
import { openOn } from '@/lib/delivery';
import { FORMATS, type FormatId } from '@/lib/boards';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';
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
   step 01 now, and when it runs is the lever that moves the price. Their
   names are in lib/copy/campaign.ts, in this order. */
const PRESETS: Daypart[][] = [
  ['afternoon'],
  ['lunch'],
  ['evening'],
  ['lunch', 'afternoon', 'evening'],
];

const ALL: Daypart[] = DAYPARTS.map((part) => part.id);

/* Nothing here measures footfall, so a week splits evenly across the days the
   booked shops are actually open. The row starts on Monday; JS weekdays start
   on Sunday, hence the wrap. */
const jsWeekday = (index: number) => (index === 6 ? 0 : index + 1);
const byPlayOf = (format: FormatId) => unitOf(format) === 'play';
const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

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
  const t = useCopy(CAMPAIGN).spend;
  const shared = useCopy(SHARED);
  const WEEKDAYS = t.weekdays;
  const unit = byPlayOf(format) ? shared.unit.plays : shared.unit.minutes;
  const one = byPlayOf(format) ? shared.unit.play : shared.unit.minute;
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
        <span className="spend-eyebrow">{byPlay ? t.eyebrowPlays : t.eyebrowMinutes}</span>
        <strong className="spend-minutes">
          {count.format(byPlay ? plays : minutes)}
          <span>{byPlay ? shared.unit.plays : t.min}</span>
        </strong>
        <div className="spend-meter" aria-hidden="true">
          <i style={{ width: `${Math.max(2, fill * 100)}%` }} />
        </div>

        <div className="spend-money">
          <b>{money.format(capped)}</b>
          <span>{t.perWeekOnMix(cents.format(byPlay ? rate / 4 : rate), one)}</span>
        </div>

        {/* An even split makes a bar chart a picture of nothing, so this is a
            row of days rather than a fake distribution. */}
        <div className="week-strip">
          <span className="week-strip-label">{t.perDay(cap(unit))}</span>
          <div className="week-row">
            {WEEKDAYS.map((letter, index) => (
              <span key={index} className={openDay(index) ? 'day' : 'day shut'}>
                <b>{letter}</b>
                <i>
                  {openDay(index)
                    ? count.format(Math.round((byPlay ? plays : minutes) / openDays))
                    : t.shut}
                </i>
              </span>
            ))}
          </div>
        </div>

        <div className="spend-stats">
          <article>
            <Repeat2 size={16} />
            <strong>{count.format(plays)}</strong>
            <span>{t.playsOf}</span>
          </article>
          <article>
            <Clock size={16} />
            <strong>{hoursLabel(minutes)}</strong>
            <span>{t.screenTime}</span>
          </article>
          <article>
            <MonitorPlay size={16} />
            <strong className="money">{money.format(capped * (52 / 12))}</strong>
            <span>{t.monthAtPace}</span>
          </article>
        </div>

        <p className="spend-note">
          {t.note(byPlay, stock.length, count.format(byPlay ? sold.plays : sold.minutes), money.format(sold.value))}
        </p>
      </div>

      <section className="rate-card">
        <div className="prefs-head">
          <h3>{t.shapeTitle}</h3>
          <span className="prefs-hint">{t.shapeHint}</span>
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
                  <b>{shared.formats[item.id].name}</b>
                </span>
                <span className="rate-price money">
                  {cents.format(rateFor(item.id, 'lunch'))}
                  <small>{t.perUnit(perPlay ? shared.unit.play : t.min)}</small>
                </span>
                <span className="rate-stock">
                  {shared.formats[item.id].blurb}
                  {perPlay && t.billedOnPlays}
                </span>
              </button>
            );
          })}
        </div>
        <p className="rate-foot">{t.shapeFoot}</p>
      </section>

      <div className="spend-controls">
        <section className="rate-card">
          <div className="prefs-head">
            <h3>{t.whenTitle}</h3>
            <span className="prefs-hint">{t.whenHint}</span>
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
                    <b>{shared.dayparts[part.id].label}</b>
                    <i>{shared.dayparts[part.id].window}</i>
                  </span>
                  <span className={`rate-tier ${part.tier}`}>{shared.tier[part.tier]}</span>
                  <span className="rate-price money">
                    {cents.format(rateFor(format, part.id))}
                    <small>{t.perUnit(byPlay ? shared.unit.play : t.min)}</small>
                  </span>
                  <span className="rate-stock">
                    {t.free(
                      count.format(
                        stock.reduce(
                          (total, venue) =>
                            total + Math.round(weeklyMinutes(venue, part.id) * (byPlay ? 4 : 1)),
                          0,
                        ),
                      ),
                      byPlay ? shared.unit.plays : t.min,
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <label className="spend-slider">
          <span className="spend-slider-head">
            <b>{t.setSpend}</b>
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
            aria-label={t.spendLabel}
            aria-valuetext={t.spendValue(money.format(capped), count.format(byPlay ? plays : minutes), unit)}
          />
          <span className="spend-scale">
            <i>{money.format(MIN_SPEND)}</i>
            <i>{t.buysEvery(money.format(ceiling), one)}</i>
          </span>
        </label>

        {full && (
          <p className="spend-full">{t.full}</p>
        )}

        <div className="spend-presets">
          {PRESETS.map((preset, i) => {
            const on =
              preset.length === chosen.length && preset.every((id) => chosen.includes(id));
            return (
              <button
                key={t.presets[i].label}
                type="button"
                className={on ? 'on' : undefined}
                onClick={() => {
                  onDayparts(preset);
                  reprice(preset, format);
                }}
              >
                <b>{t.presets[i].label}</b>
                <span>{t.presets[i].note}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { perMinuteRate };
