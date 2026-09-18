'use client';

import { useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  Clock,
  ImageIcon,
  Info,
  MapPin,
  Monitor,
  Users,
} from 'lucide-react';
import { VenueMap } from '@/components/venue-map';
import { FORMATS, boardById, type FormatId } from '@/lib/boards';
import { type Venue } from '@/lib/network';
import { cents, count, hoursLabel, money } from '@/lib/pricing';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';
import {
  byDay,
  byHour,
  daypartsOf,
  splitByDaypart,
  splitByVenue,
  totalsOf,
  type Measured,
  venuesOf,
  weeksRunning,
  type Bookable,
} from '@/lib/delivery';

/* Tab names are in lib/copy/campaign.ts under `analytics.tabs`. */
const TABS = [
  { id: 'overview', icon: BarChart3 },
  { id: 'where', icon: MapPin },
  { id: 'when', icon: Clock },
  { id: 'creative', icon: ImageIcon },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Money small enough that the whole-dollar formatter would round it to zero. */
function fine(value: number) {
  return value >= 10 ? money.format(value) : cents.format(value);
}

export function AnalyticsPanel({
  booking,
  creativeName,
  creativeSrc,
  measured,
}: {
  booking: Bookable;
  creativeName: string | null;
  creativeSrc: string | null;
  /** What the screens reported, when they have reported anything. */
  measured?: Measured | null;
}) {
  const t = useCopy(CAMPAIGN).analytics;
  const shared = useCopy(SHARED);
  const [tab, setTab] = useState<TabId>('overview');

  const totals = totalsOf(booking, measured);
  const weeks = weeksRunning(booking);
  const scale = totals.running ? weeks : 1;
  const venues = venuesOf(booking);
  const venueRows = splitByVenue(booking, scale).sort((a, b) => b.spend - a.spend);
  const daypartRows = splitByDaypart(booking, scale);
  const days = byDay(booking);
  const hours = byHour(booking, scale);
  /* A permanent spot is a place, not a quantity: nothing about it is counted,
     so everything on this panel that reads as delivery is video's. */
  const permanent = totals.permanent;
  const unit = shared.unit.minutes;
  const one = shared.unit.minute;
  /* lib/delivery.ts names weekdays in English; the page names them itself. */
  const dayName = (weekday: string) => {
    const i = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
    return i === -1 ? weekday : t.days[i];
  };

  const peakDay = days.reduce((best, row) => (row.spend > best.spend ? row : best), {
    spend: 0,
  } as (typeof days)[number]);
  const maxDay = Math.max(1, ...days.map((row) => row.spend));
  const maxHour = Math.max(1, ...hours.map((cell) => cell.minutes));
  const topVenue = venueRows[0];

  return (
    <div className="analytics">
      <div className="stat-grid">
        <article>
          <small>{totals.running ? t.spendToDate : t.bookedForWeek}</small>
          <b className="money">{money.format(totals.spend)}</b>
          <i>
            {totals.running
              ? t.daysAt(totals.days, money.format(totals.weeklySpend))
              : t.nothingCharged}
          </i>
        </article>
        <article>
          <small>{t.minutesOnScreen}</small>
          <b>{count.format(totals.minutes)}</b>
          <i>{t.playsOf15(count.format(totals.plays))}</i>
        </article>
        <article>
          <small>{t.costPer(one)}</small>
          <b className="money">{cents.format(totals.perMinute)}</b>
          <i>{t.aMinuteAPlay(cents.format(totals.perMinute), cents.format(totals.perPlay))}</i>
        </article>
        <article>
          <small>{t.heads}</small>
          <b>{count.format(totals.reach)}</b>
          <i>{t.perThousand(fine(totals.perThousand))}</i>
        </article>
        <article>
          <small>{t.shops}</small>
          <b>{totals.shops}</b>
          <i>{t.screensAreas(totals.screens, new Set(venues.map((venue) => venue.area)).size)}</i>
        </article>
        <article>
          <small>{t.format}</small>
          <b className="stat-word">{shared.formats[booking.format].name}</b>
          <i>{permanent ? t.billedOnce : t.billedBy(shared.unit.minute)}</i>
        </article>
      </div>

      <nav className="tabs" aria-label={t.tabsLabel}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'on' : undefined}
            aria-current={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={14} /> {t.tabs[item.id]}
          </button>
        ))}
      </nav>

      <div className="tab-body">
        {tab === 'overview' && (
          <div className="tab-pane">
            <section className="panel">
              <div className="panel-head">
                <h3>
                  <CalendarRange size={15} /> {totals.running ? t.dayByDay : t.weekAsBooked}
                </h3>
                <span>
                  {totals.running
                    ? t.busiest(days.length, peakDay.weekday ? dayName(peakDay.weekday) : '—', fine(peakDay.spend ?? 0))
                    : t.startsWhen}
                </span>
              </div>
              {days.length > 0 ? (
                <figure className="bars">
                  <figcaption className="visually-hidden">{t.dailyCaption(days.length)}</figcaption>
                  {days.map((row) => (
                    <span
                      key={row.date.toISOString()}
                      className={`bar${row.open ? '' : ' shut'}`}
                      title={`${dayName(row.weekday)} ${row.label} · ${fine(row.spend)} · ${count.format(row.minutes)} ${unit}`}
                    >
                      <i style={{ height: `${Math.max(2, (row.spend / maxDay) * 100)}%` }} />
                      <em>{dayName(row.weekday)[0]}</em>
                    </span>
                  ))}
                </figure>
              ) : (
                <p className="panel-empty">{t.nothingPlayed}</p>
              )}
              <dl className="pace">
                <div>
                  <dt>{t.weeklyBudget}</dt>
                  <dd className="money">{money.format(totals.weeklySpend)}</dd>
                </div>
                <div>
                  <dt>{t.perWeek(unit.charAt(0).toUpperCase() + unit.slice(1))}</dt>
                  <dd>
                    {count.format(totals.weeklyMinutes)}
                  </dd>
                </div>
                <div>
                  <dt>{t.weeksRun}</dt>
                  <dd>{totals.running ? weeks.toFixed(1) : '0'}</dd>
                </div>
                <div>
                  <dt>{t.bestShop}</dt>
                  <dd className="pace-word">{topVenue ? topVenue.venue.name : '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>
                  <Info size={15} /> {t.howTitle}
                </h3>
              </div>
              <p className="panel-note">{t.how1(cents.format(totals.perMinute))}</p>
              <p className="panel-note">{t.how2}</p>
            </section>
          </div>
        )}

        {tab === 'where' && (
          <div className="tab-pane">
            <section className="panel wide">
              <div className="panel-head">
                <h3>
                  <MapPin size={15} /> {t.everyScreen}
                </h3>
                <span>{t.shopsScreens(totals.shops, totals.screens)}</span>
              </div>
              <div className="table-scroll">
                <table className="report">
                  <thead>
                    <tr>
                      <th>{t.th.shop}</th>
                      <th>{t.th.area}</th>
                      <th className="num">{t.th.screens}</th>
                      <th className="num">{unit.charAt(0).toUpperCase() + unit.slice(1)}</th>
                      <th className="num">{t.th.time}</th>
                      <th className="num">{t.th.heads}</th>
                      <th className="num">{t.th.rate}</th>
                      <th className="num">{t.th.spend}</th>
                      <th className="share">{t.th.share}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venueRows.map((row) => (
                      <tr key={row.venue.id}>
                        <td>
                          <b>
                            {row.venue.name}
                            {row.venue.status === 'prospect' && (
                              <em className="tag soon">{t.installing}</em>
                            )}
                          </b>
                          <span className="cell-sub">{row.venue.kind}</span>
                        </td>
                        <td>{shared.areas[row.venue.area].label}</td>
                        <td className="num">{row.venue.screens}</td>
                        <td className="num">{count.format(row.minutes)}</td>
                        <td className="num">{hoursLabel(row.minutes)}</td>
                        <td className="num">{count.format(row.reach)}</td>
                        <td className="num">{cents.format(row.rate)}</td>
                        <td className="num money">{fine(row.spend)}</td>
                        <td className="share" aria-label={t.th.share}>
                          <span className="share-cell">
                            <span className="share-bar">
                              <i style={{ width: `${Math.max(1, row.share * 100)}%` }} />
                            </span>
                            <em>{Math.round(row.share * 100)}%</em>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>
                  <Monitor size={15} /> {t.onTheMap}
                </h3>
              </div>
              <div className="report-map">
                <VenueMap venues={venues as Venue[]} zoom={13} interactive={false} />
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>
                  <Users size={15} /> {t.reachPerDollar}
                </h3>
              </div>
              <ul className="rank">
                {[...venueRows]
                  .sort((a, b) => (b.spend ? b.reach / b.spend : 0) - (a.spend ? a.reach / a.spend : 0))
                  .slice(0, 6)
                  .map((row) => (
                    <li key={row.venue.id}>
                      <b>{row.venue.name}</b>
                      <span>{row.spend ? count.format(Math.round(row.reach / row.spend)) : '—'} {t.headsPerDollar}</span>
                    </li>
                  ))}
              </ul>
              <p className="panel-note">{t.trimNote}</p>
            </section>
          </div>
        )}

        {tab === 'when' && (
          <div className="tab-pane">
            <section className="panel wide">
              <div className="panel-head">
                <h3>
                  <Clock size={15} /> {t.hourByHour}
                </h3>
                <span>{t.hourSub}</span>
              </div>
              <figure className="hours">
                <figcaption className="visually-hidden">{t.hourCaption}</figcaption>
                {hours.map((cell) => (
                  <span
                    key={cell.hour}
                    className={`hour${cell.minutes ? '' : ' off-air'}`}
                    title={t.hourTitle(cell.label, count.format(cell.minutes))}
                  >
                    <i style={{ height: `${Math.max(3, (cell.minutes / maxHour) * 100)}%` }} />
                    <em>{cell.label}</em>
                  </span>
                ))}
              </figure>
              <p className="panel-note">{t.hourNote}</p>
            </section>

            <section className="panel wide">
              <div className="panel-head">
                <h3>{t.daypartCost}</h3>
                <span>{t.daypartSub(daypartsOf(booking).length, cents.format(totals.perMinute))}</span>
              </div>
              <div className="daypart-rows">
                {daypartRows.map((row) => (
                  <div key={row.id} className="daypart-row">
                    <span className="daypart-name">
                      <b>{shared.dayparts[row.id].label}</b>
                      <i>{shared.dayparts[row.id].window}</i>
                    </span>
                    <span className="daypart-bar">
                      <i
                        style={{
                          width: `${Math.max(
                            2,
                            (row.spend / Math.max(1, ...daypartRows.map((d) => d.spend))) * 100,
                          )}%`,
                        }}
                      />
                    </span>
                    <span className="daypart-figs">
                      <b>{count.format(row.minutes)}</b>
                      <i>min</i>
                    </span>
                    <span className="daypart-figs">
                      <b className="money">{fine(row.spend)}</b>
                      <i>{cents.format(row.rate)} {t.perMin}</i>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'creative' && (
          <div className="tab-pane">
            <section className="panel">
              <div className="panel-head">
                <h3>
                  <ImageIcon size={15} /> {shared.formats[booking.format].name}
                </h3>
                <span>{shared.formats[booking.format].spec}</span>
              </div>
              <CreativePreview
                format={booking.format}
                creativeName={creativeName}
                creativeSrc={creativeSrc}
              />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>{t.costInShape}</h3>
              </div>
              <dl className="pace column">
                <div>
                  <dt>{t.rateOnMix}</dt>
                  <dd className="money">{cents.format(totals.perMinute)} {t.perMin}</dd>
                </div>
                <div>
                  <dt>{t.costOnePlay}</dt>
                  <dd className="money">{cents.format(totals.perPlay)}</dd>
                </div>
                <div>
                  <dt>{t.costHour}</dt>
                  <dd className="money">{fine(totals.perMinute * 60)}</dd>
                </div>
                <div>
                  <dt>{t.monthAtPace}</dt>
                  <dd className="money">{money.format(totals.weeklySpend * (52 / 12))}</dd>
                </div>
              </dl>
              <p className="panel-note">
                {shared.formats[booking.format].blurb}{t.shapeNote}
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function CreativePreview({
  format,
  creativeName,
  creativeSrc,
}: {
  format: FormatId;
  creativeName: string | null;
  creativeSrc: string | null;
}) {
  const t = useCopy(CAMPAIGN).analytics;
  const board = boardById(FORMATS.find((item) => item.id === format)?.showcase ?? 'rosas');
  const slot = board.slots[format];
  return (
    <>
      <div className="preview-screen">
        <img src={`/boards/${board.id}.jpg`} alt={t.boardAlt(board.name)} />
        {slot && (
          <div
            className="preview-slot"
            style={{
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
            }}
          >
            {creativeSrc ? <img src={creativeSrc} alt="" /> : <span>{creativeName ?? t.artwork}</span>}
          </div>
        )}
      </div>
      <p className="panel-note">
        {creativeName ?? t.onFile}{t.exampleNote}
      </p>
    </>
  );
}
