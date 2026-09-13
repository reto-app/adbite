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
import { areaLabel, type Venue } from '@/lib/network';
import { cents, count, hoursLabel, money, unitOf } from '@/lib/pricing';
import {
  byDay,
  byHour,
  daypartsOf,
  splitByDaypart,
  splitByVenue,
  totalsOf,
  venuesOf,
  weeksRunning,
  type Bookable,
} from '@/lib/delivery';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'where', label: 'Where it ran', icon: MapPin },
  { id: 'when', label: 'When it ran', icon: Clock },
  { id: 'creative', label: 'Creative', icon: ImageIcon },
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}

/** Money small enough that the whole-dollar formatter would round it to zero. */
function fine(value: number) {
  return value >= 10 ? money.format(value) : cents.format(value);
}

export function AnalyticsPanel({
  booking,
  creativeName,
  creativeSrc,
}: {
  booking: Bookable;
  creativeName: string | null;
  creativeSrc: string | null;
}) {
  const [tab, setTab] = useState<TabId>('overview');

  const totals = totalsOf(booking);
  const weeks = weeksRunning(booking);
  const scale = totals.running ? weeks : 1;
  const venues = venuesOf(booking);
  const venueRows = splitByVenue(booking, scale).sort((a, b) => b.spend - a.spend);
  const daypartRows = splitByDaypart(booking, scale);
  const days = byDay(booking);
  const hours = byHour(booking, scale);
  const byPlay = totals.byPlay;
  const unit = byPlay ? 'plays' : 'minutes';

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
          <small>{totals.running ? 'Spend to date' : 'Booked for the week'}</small>
          <b className="money">{money.format(totals.spend)}</b>
          <i>
            {totals.running
              ? `${totals.days} day${totals.days === 1 ? '' : 's'} · ${money.format(totals.weeklySpend)} / wk`
              : 'Nothing is charged until it plays'}
          </i>
        </article>
        <article>
          <small>{byPlay ? 'Plays delivered' : 'Minutes on screen'}</small>
          <b>{count.format(byPlay ? totals.plays : totals.minutes)}</b>
          <i>{byPlay ? `${hoursLabel(totals.minutes)} of screen time` : `${count.format(totals.plays)} plays of 0:15`}</i>
        </article>
        <article>
          <small>Cost per {byPlay ? 'play' : 'minute'}</small>
          <b className="money">{cents.format(byPlay ? totals.perPlay : totals.perMinute)}</b>
          <i>
            {cents.format(totals.perMinute)} a minute · {cents.format(totals.perPlay)} a play
          </i>
        </article>
        <article>
          <small>Heads past the board</small>
          <b>{count.format(totals.reach)}</b>
          <i>{fine(totals.perThousand)} per thousand</i>
        </article>
        <article>
          <small>Shops</small>
          <b>{totals.shops}</b>
          <i>
            {totals.screens} screen{totals.screens === 1 ? '' : 's'} ·{' '}
            {new Set(venues.map((venue) => venue.area)).size} area
            {new Set(venues.map((venue) => venue.area)).size === 1 ? '' : 's'}
          </i>
        </article>
        <article>
          <small>Format</small>
          <b className="stat-word">{formatName(booking.format)}</b>
          <i>Billed by the {unitOf(booking.format)}</i>
        </article>
      </div>

      <nav className="tabs" aria-label="Campaign reporting">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'on' : undefined}
            aria-current={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={14} /> {item.label}
          </button>
        ))}
      </nav>

      <div className="tab-body">
        {tab === 'overview' && (
          <div className="tab-pane">
            <section className="panel">
              <div className="panel-head">
                <h3>
                  <CalendarRange size={15} /> {totals.running ? 'Day by day' : 'The week as booked'}
                </h3>
                <span>
                  {totals.running
                    ? `${days.length} days · busiest was ${peakDay.weekday ?? '—'} at ${fine(peakDay.spend ?? 0)}`
                    : 'Starts the day the shop approves your creative'}
                </span>
              </div>
              {days.length > 0 ? (
                <figure className="bars">
                  <figcaption className="visually-hidden">
                    Daily spend across {days.length} days, one bar a day.
                  </figcaption>
                  {days.map((row) => (
                    <span
                      key={row.date.toISOString()}
                      className={`bar${row.open ? '' : ' shut'}`}
                      title={`${row.weekday} ${row.label} · ${fine(row.spend)} · ${count.format(byPlay ? row.plays : row.minutes)} ${unit}`}
                    >
                      <i style={{ height: `${Math.max(2, (row.spend / maxDay) * 100)}%` }} />
                      <em>{row.weekday[0]}</em>
                    </span>
                  ))}
                </figure>
              ) : (
                <p className="panel-empty">
                  Nothing has played yet. This chart fills in from the first day the board runs
                  your spot, one bar a day.
                </p>
              )}
              <dl className="pace">
                <div>
                  <dt>Weekly budget</dt>
                  <dd className="money">{money.format(totals.weeklySpend)}</dd>
                </div>
                <div>
                  <dt>{byPlay ? 'Plays' : 'Minutes'} a week</dt>
                  <dd>
                    {count.format(
                      byPlay ? Math.round(totals.weeklyMinutes * 4) : totals.weeklyMinutes,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Weeks run</dt>
                  <dd>{totals.running ? weeks.toFixed(1) : '0'}</dd>
                </div>
                <div>
                  <dt>Best shop</dt>
                  <dd className="pace-word">{topVenue ? topVenue.venue.name : '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>
                  <Info size={15} /> How this is worked out
                </h3>
              </div>
              <p className="panel-note">
                Your week is spread across the shops you booked in proportion to what each one has
                to sell, then priced on the same rate card you saw when you booked:{' '}
                {cents.format(totals.perMinute)} a minute on this mix. Peak minutes cost more than
                the afternoon, so a campaign that skips the quiet hours buys fewer of them for the
                same money.
              </p>
              <p className="panel-note">
                Heads past the board is a planning figure from each shop&rsquo;s own footfall,
                pro-rated by the share of its open week your ad occupied. It is not a count of
                faces and nothing here measures attention.
              </p>
            </section>
          </div>
        )}

        {tab === 'where' && (
          <div className="tab-pane">
            <section className="panel wide">
              <div className="panel-head">
                <h3>
                  <MapPin size={15} /> Every screen it played on
                </h3>
                <span>
                  {totals.shops} shop{totals.shops === 1 ? '' : 's'} · {totals.screens} screen
                  {totals.screens === 1 ? '' : 's'}
                </span>
              </div>
              <div className="table-scroll">
                <table className="report">
                  <thead>
                    <tr>
                      <th>Shop</th>
                      <th>Area</th>
                      <th className="num">Screens</th>
                      <th className="num">{byPlay ? 'Plays' : 'Minutes'}</th>
                      <th className="num">Time on screen</th>
                      <th className="num">Heads</th>
                      <th className="num">Rate</th>
                      <th className="num">Spend</th>
                      <th className="share">Share of spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venueRows.map((row) => (
                      <tr key={row.venue.id}>
                        <td>
                          <b>
                            {row.venue.name}
                            {row.venue.status === 'prospect' && (
                              <em className="tag soon">Installing</em>
                            )}
                          </b>
                          <span className="cell-sub">{row.venue.kind}</span>
                        </td>
                        <td>{areaLabel(row.venue.area)}</td>
                        <td className="num">{row.venue.screens}</td>
                        <td className="num">{count.format(byPlay ? row.plays : row.minutes)}</td>
                        <td className="num">{hoursLabel(row.minutes)}</td>
                        <td className="num">{count.format(row.reach)}</td>
                        <td className="num">{cents.format(row.rate)}</td>
                        <td className="num money">{fine(row.spend)}</td>
                        <td className="share" aria-label="Share of spend">
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
                  <Monitor size={15} /> On the map
                </h3>
              </div>
              <div className="report-map">
                <VenueMap venues={venues as Venue[]} zoom={13} interactive={false} />
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>
                  <Users size={15} /> Reach per dollar
                </h3>
              </div>
              <ul className="rank">
                {[...venueRows]
                  .sort((a, b) => (b.spend ? b.reach / b.spend : 0) - (a.spend ? a.reach / a.spend : 0))
                  .slice(0, 6)
                  .map((row) => (
                    <li key={row.venue.id}>
                      <b>{row.venue.name}</b>
                      <span>{row.spend ? count.format(Math.round(row.reach / row.spend)) : '—'} heads / $</span>
                    </li>
                  ))}
              </ul>
              <p className="panel-note">
                Cheap minutes in a busy room go furthest. This is the order to trim from if the
                budget has to come down.
              </p>
            </section>
          </div>
        )}

        {tab === 'when' && (
          <div className="tab-pane">
            <section className="panel wide">
              <div className="panel-head">
                <h3>
                  <Clock size={15} /> Hour by hour
                </h3>
                <span>Minutes of screen time, across the shop day</span>
              </div>
              <figure className="hours">
                <figcaption className="visually-hidden">
                  Minutes of screen time by hour of the shop day.
                </figcaption>
                {hours.map((cell) => (
                  <span
                    key={cell.hour}
                    className={`hour${cell.tier ? ` ${cell.tier}` : ' off-air'}`}
                    title={`${cell.label} · ${count.format(cell.minutes)} minutes`}
                  >
                    <i style={{ height: `${Math.max(3, (cell.minutes / maxHour) * 100)}%` }} />
                    <em>{cell.label}</em>
                  </span>
                ))}
              </figure>
              <p className="panel-note">
                Every daypart you bought lands evenly across the hours it covers. Nothing here
                counts footfall by the hour, and a curve drawn from nothing would be a lie told in
                a prettier shape.
              </p>
            </section>

            <section className="panel wide">
              <div className="panel-head">
                <h3>What each daypart cost</h3>
                <span>
                  {daypartsOf(booking).length} of 3 bought ·{' '}
                  {cents.format(totals.perMinute)} a minute blended
                </span>
              </div>
              <div className="daypart-rows">
                {daypartRows.map((row) => (
                  <div key={row.id} className={`daypart-row ${row.tier}`}>
                    <span className="daypart-name">
                      <b>{row.label}</b>
                      <i>{row.window}</i>
                    </span>
                    <span className={`rate-tier ${row.tier}`}>
                      {row.tier === 'peak' ? 'Peak' : 'Off-peak'}
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
                      <b>{count.format(byPlay ? row.plays : row.minutes)}</b>
                      <i>{byPlay ? 'plays' : 'min'}</i>
                    </span>
                    <span className="daypart-figs">
                      <b className="money">{fine(row.spend)}</b>
                      <i>{cents.format(row.rate)} / min</i>
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
                  <ImageIcon size={15} /> {formatName(booking.format)}
                </h3>
                <span>{FORMATS.find((item) => item.id === booking.format)?.spec}</span>
              </div>
              <CreativePreview
                format={booking.format}
                creativeName={creativeName}
                creativeSrc={creativeSrc}
              />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>What it costs in this shape</h3>
              </div>
              <dl className="pace column">
                <div>
                  <dt>Rate on this mix</dt>
                  <dd className="money">{cents.format(totals.perMinute)} / min</dd>
                </div>
                <div>
                  <dt>Cost of one play</dt>
                  <dd className="money">{cents.format(totals.perPlay)}</dd>
                </div>
                <div>
                  <dt>Cost of an hour on screen</dt>
                  <dd className="money">{fine(totals.perMinute * 60)}</dd>
                </div>
                <div>
                  <dt>A month at this pace</dt>
                  <dd className="money">{money.format(totals.weeklySpend * (52 / 12))}</dd>
                </div>
              </dl>
              <p className="panel-note">
                {FORMATS.find((item) => item.id === booking.format)?.blurb} Change the shape and
                the price moves with it: a strip under the menu is the least we ask the room for
                and the least we charge.
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
  const board = boardById(FORMATS.find((item) => item.id === format)?.showcase ?? 'rosas');
  const slot = board.slots[format];
  return (
    <>
      <div className="preview-screen">
        <img src={`/boards/${board.id}.jpg`} alt={`${board.name} board`} />
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
            {creativeSrc ? <img src={creativeSrc} alt="" /> : <span>{creativeName ?? 'Artwork'}</span>}
          </div>
        )}
      </div>
      <p className="panel-note">
        {creativeName ?? 'Artwork on file'} · shown on an example board to illustrate the slot. The
        boards you booked are not pictured.
      </p>
    </>
  );
}
