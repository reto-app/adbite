'use client';

import { Clock, Image as ImageIcon, MonitorPlay, Play } from 'lucide-react';
import { Bite } from '@/components/brand';
import { LIVE_VENUES, type Venue } from '@/lib/network';
import { openOn } from '@/lib/delivery';
import type { FormatId } from '@/lib/boards';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';
import {
  DAYPARTS,
  SPOT_YEARLY,
  VIDEO_HOURLY,
  count,
  hoursLabel,
  inventory,
  isPermanent,
  maxHours,
  money,
  spotCost,
  spotsFree,
  totalSpotsFree,
  videoCost,
  type Daypart,
} from '@/lib/pricing';

/* Step 02: which of the two things you are buying, and how much of it.
 *
 * This replaced a spend slider that priced a week by the minute across four
 * formats at two tiers. There are two products now and they are not two rows
 * of one table: a permanent spot is a place on a board held for a year, and
 * video is time bought by the hour. So they are two cards, and choosing one
 * changes what there is to decide rather than which number is highlighted. */

const ALL: Daypart[] = DAYPARTS.map((part) => part.id);

/* Nothing here measures footfall, so a week splits evenly across the days the
   booked shops are actually open. The row starts on Monday; JS weekdays start
   on Sunday, hence the wrap. */
const jsWeekday = (index: number) => (index === 6 ? 0 : index + 1);

export function BuyStep({
  format,
  onFormat,
  spots,
  onSpots,
  hours,
  onHours,
  dayparts,
  onDayparts,
  venues,
}: {
  format: FormatId;
  onFormat: (format: FormatId) => void;
  spots: number;
  onSpots: (spots: number) => void;
  hours: number;
  onHours: (hours: number) => void;
  dayparts: Daypart[];
  onDayparts: (dayparts: Daypart[]) => void;
  /** The shops picked in step 01. Everything on this screen is priced on them. */
  venues: Venue[];
}) {
  const t = useCopy(CAMPAIGN).buy;
  const shared = useCopy(SHARED);
  const stock = venues.length ? venues : LIVE_VENUES;
  const chosen = dayparts.length ? dayparts : ALL;
  const permanent = isPermanent(format);

  const free = totalSpotsFree(stock);
  const takenSpots = Math.min(spots, free);
  const capHours = maxHours(stock, chosen);
  const takenHours = Math.min(hours, capHours);
  const minutes = Math.round(takenHours * 60);
  const full = !permanent && takenHours >= capHours;

  /* A shop that shuts on Sunday should not appear to bill for it, so a day
     counts only if some booked shop is open on it. */
  const openDay = (index: number) => stock.some((venue) => openOn(venue, jsWeekday(index)));
  const openDays = t.weekdays.filter((_, index) => openDay(index)).length || 1;

  const screens = stock.reduce((total, venue) => total + venue.screens, 0);

  const cards: {
    id: FormatId;
    icon: React.ReactNode;
    name: string;
    note: string;
    price: string;
    unit: string;
  }[] = [
    {
      id: 'banner',
      icon: <ImageIcon size={18} />,
      name: t.spot.name,
      note: t.spot.note,
      price: money.format(SPOT_YEARLY),
      unit: t.spot.unit,
    },
    {
      id: 'video',
      icon: <Play size={18} />,
      name: t.video.name,
      note: t.video.note,
      price: money.format(VIDEO_HOURLY),
      unit: t.video.unit,
    },
  ];

  return (
    <div className="buy-step">
      <div className="buy-hero">
        <Bite className="bite" />
        {permanent ? (
          <>
            <span className="buy-eyebrow">{t.spot.total}</span>
            <strong className="buy-figure money">{money.format(spotCost(takenSpots))}</strong>
            <span className="buy-under">{t.spot.per}</span>
            <p className="buy-line">{t.spot.picked(takenSpots, free)}</p>
          </>
        ) : (
          <>
            <span className="buy-eyebrow">{t.minutesAWeek}</span>
            <strong className="buy-figure">
              {count.format(minutes)}
              <span>min</span>
            </strong>
            <span className="buy-under">
              <b className="money">{money.format(videoCost(takenHours))}</b> {t.video.total}
            </span>
            <p className="buy-line">
              {t.video.picked(hoursLabel(minutes), hoursLabel(capHours * 60))}
            </p>
          </>
        )}

        <p className="buy-held">
          <MonitorPlay size={14} /> {t.screensHeld(screens, stock.length)}
        </p>

        {/* An even split makes a bar chart a picture of nothing, so this is a
            row of days rather than a fake distribution. */}
        {!permanent && (
          <div className="week-strip">
            <span className="week-strip-label">{t.perDay}</span>
            <div className="week-row">
              {t.weekdays.map((letter, index) => (
                <span key={index} className={openDay(index) ? 'day' : 'day shut'}>
                  <b>{letter}</b>
                  <i>{openDay(index) ? count.format(Math.round(minutes / openDays)) : t.shut}</i>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="buy-foot">{permanent ? t.spot.foot : t.video.foot}</p>
      </div>

      <div className="buy-controls">
        <section className="rate-card">
          <div className="prefs-head">
            <h3>{t.title}</h3>
            <span className="prefs-hint">{t.hint}</span>
          </div>
          <div className="rate-rows">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                className={`rate-row${format === card.id ? ' on' : ''}`}
                aria-pressed={format === card.id}
                onClick={() => onFormat(card.id)}
              >
                <span className="rate-when">
                  {card.icon}
                  <b>{card.name}</b>
                </span>
                <span className="rate-price money">
                  {card.price}
                  <small>{card.unit}</small>
                </span>
                <span className="rate-stock">{card.note}</span>
              </button>
            ))}
          </div>
        </section>

        {permanent ? (
          <section className="rate-card">
            <div className="prefs-head">
              <h3>{t.spot.pick}</h3>
              <span className="prefs-hint">{t.spot.picked(takenSpots, free)}</span>
            </div>
            {free === 0 ? (
              <p className="rate-foot">{t.spot.none}</p>
            ) : (
              <>
                <label className="buy-slider">
                  <input
                    className="range-input"
                    type="range"
                    min={1}
                    max={free}
                    step={1}
                    value={Math.max(1, takenSpots)}
                    onChange={(event) => onSpots(Number(event.target.value))}
                    style={
                      { '--fill': `${(takenSpots / Math.max(1, free)) * 100}%` } as React.CSSProperties
                    }
                    aria-label={t.spot.pick}
                    aria-valuetext={t.spot.picked(takenSpots, free)}
                  />
                  <span className="buy-scale">
                    <i>1</i>
                    <i>{free}</i>
                  </span>
                </label>
                {/* Which boards have one free is the thing worth seeing, so
                    the shops picked in step 01 are listed with their count. */}
                <ul className="spot-list">
                  {stock.map((venue) => (
                    <li key={venue.id}>
                      <b>{venue.name}</b>
                      <span>{spotsFree(venue)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="rate-foot">{t.whenAll}</p>
          </section>
        ) : (
          <>
            <section className="rate-card">
              <div className="prefs-head">
                <h3>{t.video.pick}</h3>
                <span className="prefs-hint">
                  {t.video.picked(hoursLabel(minutes), hoursLabel(capHours * 60))}
                </span>
              </div>
              <label className="buy-slider">
                <span className="buy-slider-head">
                  <b>
                    <Clock size={14} /> {hoursLabel(minutes)}
                  </b>
                  <em className="money">{money.format(videoCost(takenHours))}</em>
                </span>
                <input
                  className="range-input"
                  type="range"
                  min={1}
                  max={capHours}
                  step={1}
                  value={Math.max(1, takenHours)}
                  onChange={(event) => onHours(Number(event.target.value))}
                  style={
                    { '--fill': `${(takenHours / Math.max(1, capHours)) * 100}%` } as React.CSSProperties
                  }
                  aria-label={t.video.pick}
                  aria-valuetext={t.video.picked(hoursLabel(minutes), hoursLabel(capHours * 60))}
                />
                <span className="buy-scale">
                  <i>1 hr</i>
                  <i>{hoursLabel(capHours * 60)}</i>
                </span>
              </label>
              {full && <p className="spend-full">{t.full}</p>}
            </section>

            <section className="rate-card">
              <div className="prefs-head">
                <h3>{t.whenTitle}</h3>
                <span className="prefs-hint">{t.whenHint}</span>
              </div>
              <div className="rate-rows">
                {DAYPARTS.map((part) => {
                  const on = chosen.includes(part.id);
                  const partHours = Math.floor(inventory(stock, [part.id]).hours);
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
                        onDayparts(settled);
                        onHours(Math.min(hours, maxHours(stock, settled)));
                      }}
                    >
                      <span className="rate-when">
                        <b>{shared.dayparts[part.id].label}</b>
                        <i>{shared.dayparts[part.id].window}</i>
                      </span>
                      <span className="rate-price money">
                        {money.format(VIDEO_HOURLY)}
                        <small>/ hr</small>
                      </span>
                      <span className="rate-stock">{hoursLabel(partHours * 60)} free</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
