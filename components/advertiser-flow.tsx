'use client';

import { useState } from 'react';
import { Link } from '@/components/nav';
import {
  ArrowRight,
  Check,
  MonitorPlay,
  Receipt,
  RotateCcw,
  X,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { FORMATS, boardById, type FormatId } from '@/lib/boards';
import { DAYPARTS, PILOT_CITY, VENUES, totalScreens, type Daypart } from '@/lib/network';
import { VenueMap } from '@/components/venue-map';
import { useSession } from '@/lib/auth';

const RATE = 0.03;
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-US');

type NodeId = 'spend' | 'where' | 'creative' | 'review' | 'live' | 'bill';
type Verdict = 'pending' | 'approved' | 'rejected';

const NODES: { id: NodeId; marker: string; title: string; note: string; kind?: 'decision' }[] = [
  { id: 'spend', marker: '01', title: 'Set your spend', note: 'Minutes, not impressions' },
  { id: 'where', marker: '02', title: 'Choose where', note: 'Shop, time of day' },
  { id: 'creative', marker: '03', title: 'Build your ad', note: 'Format and artwork' },
  { id: 'review', marker: '?', title: 'The shop owner reviews it', note: 'Their screen, their call', kind: 'decision' },
  { id: 'live', marker: '→', title: 'Your ad joins the rotation', note: 'In front of the whole room' },
  { id: 'bill', marker: '$', title: 'You pay for minutes shown', note: 'The rest rolls over' },
];

/* A stand-in creative, so the flow shows a real ad in a real slot rather than
   an empty rectangle. Warm color belongs to the advertiser, never to AdBite. */
function SampleAd({ format }: { format: FormatId }) {
  return (
    <div className={`flow-ad is-${format}`}>
      <span>Mia’s Flower Bar</span>
      <b>Bright stems for your table</b>
      <small>Freedom Blvd &amp; 700 North · open till 7</small>
      {format === 'video' && <em className="flow-ad-clock">0:15</em>}
    </div>
  );
}

function BoardShot({ format, dim }: { format: FormatId; dim?: boolean }) {
  const board = boardById(FORMATS.find((item) => item.id === format)?.showcase ?? 'rosas');
  const slot = board.slots[format];
  return (
    <figure className={`flow-board${dim ? ' dim' : ''}`}>
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
            <SampleAd format={format} />
          </div>
        )}
      </div>
      <figcaption>
        {board.name} · {board.screen}
      </figcaption>
    </figure>
  );
}

export function AdvertiserFlow() {
  const { session } = useSession();
  const [node, setNode] = useState<NodeId>('spend');
  const [spend, setSpend] = useState(150);
  const [dayparts, setDayparts] = useState<Daypart[]>([]);
  const [format, setFormat] = useState<FormatId>('banner');
  const [verdict, setVerdict] = useState<Verdict>('pending');

  const minutes = Math.round(spend / RATE);
  const fill = (spend - 25) / (600 - 25);

  // A week rarely fills to the last minute, and the remainder carries over.
  const shown = Math.round(minutes * 0.996);
  const billed = shown * RATE;

  const index = NODES.findIndex((item) => item.id === node);

  return (
    <section className="flow-section" id="flow">
      <div className="wrap">
        <div className="section-head">
          <h2>How it works</h2>
        </div>

        <div className="flow">
          <ol className="flow-map">
            {NODES.map((item, i) => (
              <li
                key={item.id}
                className={[
                  'flow-node',
                  item.kind === 'decision' ? 'decision' : '',
                  node === item.id ? 'on' : '',
                  i < index ? 'past' : '',
                  verdict === 'rejected' && (item.id === 'live' || item.id === 'bill')
                    ? 'muted'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button type="button" onClick={() => setNode(item.id)} aria-current={node === item.id}>
                  <span className="flow-marker" aria-hidden="true">
                    {item.marker}
                  </span>
                  <span className="flow-text">
                    <b>{item.title}</b>
                    <small>{item.note}</small>
                  </span>
                </button>

                {item.id === 'review' && (
                  <div className={`flow-branch${verdict === 'rejected' ? ' on' : ''}`}>
                    <RotateCcw size={14} />
                    <span>
                      Rejected? Swap the artwork and it comes straight back to <b>step 03</b>. No
                      charge for an ad that never ran.
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="flow-panel">
            {node === 'spend' && (
              <div className="flow-body">
                <div className="flow-figure">
                  <Bite className="bite" />
                  <small>Minutes on screen each week</small>
                  <strong>
                    {count.format(minutes)}
                    <span>min</span>
                  </strong>
                  <div className="spend-meter" aria-hidden="true">
                    <i style={{ width: `${Math.max(3, fill * 100)}%` }} />
                  </div>
                  <p>
                    <b>{money.format(spend)}</b> a week · {cents.format(RATE)} a minute
                  </p>
                </div>
                <label className="flow-slider">
                  <span>Drag to set a weekly spend</span>
                  <input
                    className="range-input"
                    type="range"
                    min={25}
                    max={600}
                    step={5}
                    value={spend}
                    onChange={(event) => setSpend(Number(event.target.value))}
                    style={{ '--fill': `${fill * 100}%` } as React.CSSProperties}
                    aria-label="Weekly spend"
                    aria-valuetext={`${money.format(spend)} a week, ${count.format(minutes)} minutes on screen`}
                  />
                </label>
                <p className="flow-note">
                  You buy screen time by the minute. No auctions, no bidding against national
                  brands for the shop down the street.
                </p>
              </div>
            )}

            {node === 'where' && (
              <div className="flow-body">
                <div className="flow-venue">
                  {VENUES.map((venue) => (
                    <div key={venue.id}>
                      <b>{venue.name}</b>
                      <span>{venue.kind}</span>
                      <span>
                        {venue.street}, {venue.city}
                      </span>
                      <span>{venue.hours}</span>
                    </div>
                  ))}
                </div>
                <div className="map-frame">
                  <VenueMap venues={VENUES} zoom={15} />
                </div>
                <div className="flow-chips">
                  {DAYPARTS.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      className={`chip${dayparts.includes(part.id) ? ' on' : ''}`}
                      aria-pressed={dayparts.includes(part.id)}
                      onClick={() =>
                        setDayparts(
                          dayparts.includes(part.id)
                            ? dayparts.filter((item) => item !== part.id)
                            : [...dayparts, part.id],
                        )
                      }
                    >
                      {part.label} <i>{part.window}</i>
                    </button>
                  ))}
                </div>
                <p className="flow-note">
                  AdBite is live in one shop in {PILOT_CITY} today, so &ldquo;where&rdquo; is a
                  short list. Ask for a time of day and it travels with the booking. As shops join,
                  this map and the builder fill in together.
                </p>
              </div>
            )}

            {node === 'creative' && (
              <div className="flow-body">
                <div className="flow-chips">
                  {FORMATS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`chip${format === item.id ? ' on' : ''}`}
                      aria-pressed={format === item.id}
                      onClick={() => {
                        setFormat(item.id);
                        setVerdict('pending');
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <BoardShot format={format} />
                <p className="flow-note">
                  {FORMATS.find((item) => item.id === format)?.blurb} Upload your own artwork in the
                  builder and it lands in this exact slot, on every board that carries the format.
                </p>
              </div>
            )}

            {node === 'review' && (
              <div className="flow-body">
                <BoardShot format={format} dim={verdict === 'rejected'} />
                <div className={`flow-verdict is-${verdict}`}>
                  {verdict === 'pending' && (
                    <>
                      <p>
                        The shop sees your ad before anyone else does. Try it from their side:
                      </p>
                      <div className="flow-verdict-actions">
                        <button type="button" onClick={() => setVerdict('rejected')}>
                          <X size={16} /> Reject
                        </button>
                        <button type="button" className="approve" onClick={() => setVerdict('approved')}>
                          <Check size={16} /> Approve
                        </button>
                      </div>
                    </>
                  )}
                  {verdict === 'approved' && (
                    <>
                      <p>
                        <b>Approved.</b> It goes into the rotation on the next content push, and
                        your minutes start counting from the first play.
                      </p>
                      <button type="button" className="flow-again" onClick={() => setVerdict('pending')}>
                        <RotateCcw size={14} /> Try the other answer
                      </button>
                    </>
                  )}
                  {verdict === 'rejected' && (
                    <>
                      <p>
                        <b>Rejected.</b> Nothing runs, nothing is billed. You get the reason if the
                        owner gives one, swap the artwork, and it returns to their queue.
                      </p>
                      <div className="flow-verdict-actions">
                        <button type="button" onClick={() => setNode('creative')}>
                          <RotateCcw size={16} /> Back to step 03
                        </button>
                        <button type="button" className="approve" onClick={() => setVerdict('pending')}>
                          Try again
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {node === 'live' && (
              <div className="flow-body">
                <BoardShot format={format} />
                <div className="flow-rotation">
                  <span className="flow-live">
                    <i /> On screen now
                  </span>
                  <div className="flow-loop" aria-hidden="true">
                    <i className="mine">You</i>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="flow-note">
                    Your turn comes round every few minutes, every hour the shop is open, on the
                    only screen in the room. Nobody scrolls past it, nobody blocks it, and nobody
                    else is bidding for that second.
                  </p>
                </div>
              </div>
            )}

            {node === 'bill' && (
              <div className="flow-body">
                <div className="flow-bill">
                  <div className="flow-bill-head">
                    <Receipt size={18} />
                    <span>Week of Sep 8 · {VENUES.length} shop</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Minutes booked</dt>
                      <dd>{count.format(minutes)}</dd>
                    </div>
                    <div>
                      <dt>Minutes actually shown</dt>
                      <dd>{count.format(shown)}</dd>
                    </div>
                    <div>
                      <dt>Rate</dt>
                      <dd>{cents.format(RATE)} / min</dd>
                    </div>
                    <div className="rolled">
                      <dt>Unshown, rolled into next week</dt>
                      <dd>{count.format(minutes - shown)} min</dd>
                    </div>
                  </dl>
                  <div className="flow-bill-total">
                    <span>You pay</span>
                    <strong>{cents.format(billed)}</strong>
                  </div>
                </div>
                <p className="flow-note">
                  A play that never happened is never charged. That is the whole billing model:
                  minutes on a screen, counted by the player, reported back every week.
                </p>
              </div>
            )}

            <div className="flow-cta">
              {session ? (
                <Link className="button primary" href="/dashboard">
                  Open your dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <Link className="button primary" href="/signin?next=%2Fdashboard">
                  Sign in and build yours <ArrowRight size={16} />
                </Link>
              )}
              <span>
                <MonitorPlay size={15} /> {VENUES.length} shop · {totalScreens()} screen in{' '}
                {PILOT_CITY}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
