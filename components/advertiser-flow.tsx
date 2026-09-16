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
/* The marketing flow prices and draws only the boards that are actually
   playing ads. The campaign builder shows the whole pipeline, prospects
   included, because that is where you book ahead; a page that says "live in
   one shop" must not quietly map seventeen. */
import { LIVE_VENUES, PILOT_CITY, totalScreens } from '@/lib/network';
import { VenueMap } from '@/components/venue-map';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';
import {
  DAYPARTS,
  blendedRate,
  cents,
  count,
  maxSpend,
  minutesFor,
  money,
  rateFor,
  unitOf,
  type Daypart,
} from '@/lib/pricing';

type NodeId = 'spend' | 'where' | 'creative' | 'review' | 'live' | 'bill';
type Verdict = 'pending' | 'approved' | 'rejected';

/* The words for each node are in lib/copy/campaign.ts under `flow.nodes`,
   in this order. */
const NODES: { id: NodeId; marker: string; kind?: 'decision' }[] = [
  { id: 'spend', marker: '01' },
  { id: 'where', marker: '02' },
  { id: 'creative', marker: '03' },
  { id: 'review', marker: '?', kind: 'decision' },
  { id: 'live', marker: '→' },
  { id: 'bill', marker: '$' },
];

/* A stand-in creative, so the flow shows a real ad in a real slot rather than
   an empty rectangle. Warm color belongs to the advertiser, never to AdBite. */
function SampleAd({ format }: { format: FormatId }) {
  const t = useCopy(CAMPAIGN).flow.sample;
  return (
    <div className={`flow-ad is-${format}`}>
      <span>{t.name}</span>
      <b>{t.line}</b>
      <small>{t.where}</small>
      {format === 'video' && <em className="flow-ad-clock">0:15</em>}
    </div>
  );
}

function BoardShot({ format, dim }: { format: FormatId; dim?: boolean }) {
  const t = useCopy(CAMPAIGN).creative;
  const board = boardById(FORMATS.find((item) => item.id === format)?.showcase ?? 'rosas');
  const slot = board.slots[format];
  return (
    <figure className={`flow-board${dim ? ' dim' : ''}`}>
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

const ALL_DAYPARTS: Daypart[] = DAYPARTS.map((part) => part.id);

export function AdvertiserFlow() {
  const t = useCopy(CAMPAIGN).flow;
  const shared = useCopy(SHARED);
  const [node, setNode] = useState<NodeId>('spend');
  const [spend, setSpend] = useState(60);
  const [dayparts, setDayparts] = useState<Daypart[]>(ALL_DAYPARTS);
  const [format, setFormat] = useState<FormatId>('banner');
  const [verdict, setVerdict] = useState<Verdict>('pending');

  const chosen = dayparts.length ? dayparts : ALL_DAYPARTS;
  const ceiling = maxSpend(LIVE_VENUES, chosen, format);
  const capped = Math.min(spend, ceiling);
  const minutes = minutesFor(capped, LIVE_VENUES, chosen, format);
  const rate = blendedRate(LIVE_VENUES, chosen, format);
  const byPlay = unitOf(format) === 'play';
  const one = byPlay ? shared.unit.play : shared.unit.minute;
  const units = byPlay ? shared.unit.plays : 'min';
  const fill = (capped - 25) / Math.max(1, ceiling - 25);

  // A week rarely fills to the last minute, and the remainder carries over.
  const shown = Math.round(minutes * 0.996);
  const billed = shown * rate;

  const index = NODES.findIndex((item) => item.id === node);

  return (
    <section className="flow-section" id="flow">
      <div className="wrap">
        <div className="section-head">
          <h2>{t.title}</h2>
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
                    <b>{t.nodes[i].title}</b>
                    <small>{t.nodes[i].note}</small>
                  </span>
                </button>

                {item.id === 'review' && (
                  <div className={`flow-branch${verdict === 'rejected' ? ' on' : ''}`}>
                    <RotateCcw size={14} />
                    <span>
                      {t.branchBefore}<b>{t.branchStep}</b>{t.branchAfter}
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
                  <small>{byPlay ? t.timesPlays : t.minutesOnScreen}</small>
                  <strong>
                    {count.format(byPlay ? minutes * 4 : minutes)}
                    <span>{units}</span>
                  </strong>
                  <div className="spend-meter" aria-hidden="true">
                    <i style={{ width: `${Math.max(3, fill * 100)}%` }} />
                  </div>
                  <p>
                    <b className="money">{money.format(capped)}</b>
                    {t.aWeekOnMix(cents.format(byPlay ? rate / 4 : rate), one)}
                  </p>
                </div>
                <label className="flow-slider">
                  <span>{t.drag}</span>
                  <input
                    id="flow-spend"
                    className="range-input"
                    type="range"
                    min={25}
                    max={ceiling}
                    step={1}
                    value={capped}
                    onChange={(event) => setSpend(Number(event.target.value))}
                    style={{ '--fill': `${fill * 100}%` } as React.CSSProperties}
                    aria-label={shared.nav.earnings}
                    aria-valuetext={t.spendValue(money.format(capped), count.format(minutes))}
                  />
                </label>
                <p className="flow-note">
                  {t.spendNote(cents.format(rateFor('banner', 'afternoon')), cents.format(rateFor('full', 'lunch')))}
                </p>
              </div>
            )}

            {node === 'where' && (
              <div className="flow-body">
                <div className="flow-venue">
                  {LIVE_VENUES.map((venue) => (
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
                  <VenueMap venues={LIVE_VENUES} zoom={15} />
                </div>
                <div className="flow-chips">
                  {DAYPARTS.map((part) => {
                    const on = chosen.includes(part.id);
                    return (
                      <button
                        key={part.id}
                        type="button"
                        className={`chip price${on ? ' on' : ''}`}
                        aria-pressed={on}
                        onClick={() => {
                          const next = on
                            ? chosen.filter((item) => item !== part.id)
                            : [...chosen, part.id];
                          setDayparts(next.length ? next : ALL_DAYPARTS);
                        }}
                      >
                        {shared.dayparts[part.id].label} <i>{shared.dayparts[part.id].window}</i>
                        <em className="money">
                          {cents.format(rateFor(format, part.id))}
                        </em>
                      </button>
                    );
                  })}
                </div>
                <p className="flow-note">{t.whereNote(PILOT_CITY)}</p>
              </div>
            )}

            {node === 'creative' && (
              <div className="flow-body">
                <div className="flow-chips">
                  {FORMATS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`chip price${format === item.id ? ' on' : ''}`}
                      aria-pressed={format === item.id}
                      onClick={() => {
                        setFormat(item.id);
                        setVerdict('pending');
                      }}
                    >
                      {shared.formats[item.id].name}
                      <em className="money">{cents.format(rateFor(item.id, 'lunch'))}</em>
                    </button>
                  ))}
                </div>
                <BoardShot format={format} />
                <p className="flow-note">
                  {shared.formats[format].blurb}{' '}
                  {byPlay
                    ? t.billedPerPlay
                    : t.peakOff(cents.format(rateFor(format, 'lunch')), cents.format(rateFor(format, 'afternoon')))}
                  {t.uploadLands}
                </p>
              </div>
            )}

            {node === 'review' && (
              <div className="flow-body">
                <BoardShot format={format} dim={verdict === 'rejected'} />
                <div className={`flow-verdict is-${verdict}`}>
                  {verdict === 'pending' && (
                    <>
                      <p>{t.reviewPending}</p>
                      <div className="flow-verdict-actions">
                        <button type="button" onClick={() => setVerdict('rejected')}>
                          <X size={16} /> {t.reject}
                        </button>
                        <button type="button" className="approve" onClick={() => setVerdict('approved')}>
                          <Check size={16} /> {t.approve}
                        </button>
                      </div>
                    </>
                  )}
                  {verdict === 'approved' && (
                    <>
                      <p>
                        <b>{t.approved}</b>{t.approvedText}
                      </p>
                      <button type="button" className="flow-again" onClick={() => setVerdict('pending')}>
                        <RotateCcw size={14} /> {t.tryOther}
                      </button>
                    </>
                  )}
                  {verdict === 'rejected' && (
                    <>
                      <p>
                        <b>{t.rejected}</b>{t.rejectedText}
                      </p>
                      <div className="flow-verdict-actions">
                        <button type="button" onClick={() => setNode('creative')}>
                          <RotateCcw size={16} /> {t.backTo3}
                        </button>
                        <button type="button" className="approve" onClick={() => setVerdict('pending')}>
                          {t.tryAgain}
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
                    <i /> {t.onScreenNow}
                  </span>
                  <div className="flow-loop" aria-hidden="true">
                    <i className="mine">{t.you}</i>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="flow-note">{t.liveNote}</p>
                </div>
              </div>
            )}

            {node === 'bill' && (
              <div className="flow-body">
                <div className="flow-bill">
                  <div className="flow-bill-head">
                    <Receipt size={18} />
                    <span>{t.weekOf(LIVE_VENUES.length)}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>{t.booked(byPlay)}</dt>
                      <dd>{count.format(byPlay ? minutes * 4 : minutes)}</dd>
                    </div>
                    <div>
                      <dt>{t.ran(byPlay)}</dt>
                      <dd>{count.format(byPlay ? shown * 4 : shown)}</dd>
                    </div>
                    <div>
                      <dt>{t.rate}</dt>
                      <dd>
                        {cents.format(byPlay ? rate / 4 : rate)} / {byPlay ? shared.unit.play : 'min'}
                      </dd>
                    </div>
                    <div className="rolled">
                      <dt>{t.rolled}</dt>
                      <dd>
                        {count.format(byPlay ? (minutes - shown) * 4 : minutes - shown)} {units}
                      </dd>
                    </div>
                  </dl>
                  <div className="flow-bill-total">
                    <span>{t.youPay}</span>
                    <strong>{cents.format(billed)}</strong>
                  </div>
                </div>
                <p className="flow-note">{t.billNote}</p>
              </div>
            )}

            <div className="flow-cta">
              <Link className="button primary" href="/dashboard" data-track="flow-build">
                {t.cta} <ArrowRight size={16} />
              </Link>
              <span>
                <MonitorPlay size={15} /> {t.ctaSub(LIVE_VENUES.length, totalScreens(LIVE_VENUES), PILOT_CITY)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
