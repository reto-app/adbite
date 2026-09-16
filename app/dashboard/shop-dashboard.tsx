'use client';

import { useState } from 'react';
import {
  Check,
  Clapperboard,
  LayoutTemplate,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Tv,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SideSwitch } from '@/components/side-switch';
import { BoardCanvas } from '@/components/board/board-canvas';
import { MenuEditor } from '@/components/board/menu-editor';
import {
  PLACEMENTS,
  SLOTS,
  THEMES,
  itemCount,
  newId,
  placementById,
  resetBoard,
  saveBoard,
  shareOf,
  useBoard,
  type Board,
  type SlotId,
  type ThemeId,
} from '@/lib/board';
import { LIVE_VENUES } from '@/lib/network';
import {
  DAYPARTS,
  count,
  daypartEarnings,
  inventory,
  money,
  monthlyEarnings,
  weeklyEarnings,
  yearlyEarnings,
} from '@/lib/pricing';
import {
  approveCampaign,
  rejectCampaign,
  statusOf,
  useCampaigns,
  type Campaign,
} from '@/lib/campaigns';
import { FORMATS } from '@/lib/boards';
import { POLL_MINUTES, isOnline, pairDevice, renameDevice, useDevices, type Device } from '@/lib/devices';

const SHOP = LIVE_VENUES[0];
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const NAV = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
];

const TABS = [
  { id: 'board', label: 'Your board', icon: LayoutTemplate },
  { id: 'ads', label: 'Ads waiting', icon: Check },
  { id: 'money', label: 'What it pays', icon: Wallet },
  { id: 'tvs', label: 'Your TVs', icon: Tv },
] as const;

type TabId = (typeof TABS)[number]['id'];

const MAX_CLIP = 8 * 1024 * 1024;

export function ShopDashboard() {
  const { ready, board } = useBoard();
  const { campaigns } = useCampaigns();
  const [tab, setTab] = useState<TabId>('board');
  const [slot, setSlot] = useState<SlotId>('midday');

  const set = (patch: Partial<Board>) => saveBoard({ ...board, ...patch });

  /* Earnings move with where the shop lets ads sit, because that is the lever
     it actually holds. Everything else about the week is the shop's own hours.
     The share behind each placement is pricing's business, not the shop's. */
  const priced = { ...SHOP, adShare: shareOf(board.adPlacement) };
  const waiting = campaigns.filter(
    (campaign) => campaign.venues.includes(SHOP.id) && statusOf(campaign) === 'review',
  );

  if (!ready) {
    return (
      <main className="campaign-page">
        <SiteHeader nav={NAV} />
        <div className="campaign-loading" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="campaign-page shop-page">
      <SiteHeader nav={NAV} />
      <div className="dash-head">
        <div className="wrap dash-head-inner">
          <div>
            <span className="eyebrow">
              <span className="pulse" /> {board.shopName || 'Your shop'}
            </span>
            <h1>Your screen</h1>
          </div>
          <dl className="dash-totals">
            <div>
              <dt>On the board</dt>
              <dd>{itemCount(board)}</dd>
            </div>
            <div>
              <dt>Ads sit</dt>
              <dd>{placementById(board.adPlacement).short}</dd>
            </div>
            <div>
              <dt>Waiting on you</dt>
              <dd>{waiting.length}</dd>
            </div>
            <div>
              <dt>You are paid</dt>
              <dd className="money">{money.format(weeklyEarnings(priced))} / wk</dd>
            </div>
          </dl>
          <SideSwitch />
          <nav className="tabs head-tabs" aria-label="Shop workspace">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'on' : undefined}
                aria-current={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                <item.icon size={14} /> {item.label}
                {item.id === 'ads' && waiting.length > 0 && <i className="tab-dot" />}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {tab === 'board' && (
        <BoardTab board={board} slot={slot} onSlot={setSlot} onChange={set} />
      )}
      {tab === 'ads' && <AdsTab waiting={waiting} campaigns={campaigns} />}
      {tab === 'money' && <MoneyTab board={board} priced={priced} />}
      {tab === 'tvs' && <TvTab />}
    </main>
  );
}

/* ---- the builder --------------------------------------------------------- */

function BoardTab({
  board,
  slot,
  onSlot,
  onChange,
}: {
  board: Board;
  slot: SlotId;
  onSlot: (slot: SlotId) => void;
  onChange: (patch: Partial<Board>) => void;
}) {
  const [clipError, setClipError] = useState('');

  const takeClip = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setClipError('That file isn’t a video. An MP4 of your kitchen is ideal.');
      return;
    }
    if (file.size > MAX_CLIP) {
      setClipError('That clip is over 8 MB. Trim it or export it smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setClipError('');
      onChange({ media: { on: true, name: file.name, src: reader.result } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="shop-body">
      <div className="shop-edit">
        <div className="slot-tabs" role="tablist" aria-label="Which board">
          {SLOTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={slot === item.id}
              className={slot === item.id ? 'on' : undefined}
              onClick={() => onSlot(item.id)}
            >
              <b>{item.label}</b>
              <i>{item.window}</i>
            </button>
          ))}
        </div>

        <div className="shop-scroll">
          <MenuEditor
            board={board}
            slot={slot}
            onChange={(sections) => onChange({ slots: { ...board.slots, [slot]: sections } })}
          />

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>The shop</h3>
              <span className="prefs-hint">What sits along the top of every board</span>
            </div>
            <label className="shop-field">
              Name
              <input
                value={board.shopName}
                onChange={(event) => onChange({ shopName: event.target.value })}
              />
            </label>
            <label className="shop-field">
              Line underneath
              <input
                value={board.tagline}
                placeholder="What you sell, and where you are"
                onChange={(event) => onChange({ tagline: event.target.value })}
              />
            </label>
          </section>

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>How it looks</h3>
              <span className="prefs-hint">Four grounds. Nothing else to design</span>
            </div>
            <div className="theme-row">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-chip theme-${theme.id}${board.theme === theme.id ? ' on' : ''}`}
                  aria-pressed={board.theme === theme.id}
                  onClick={() => onChange({ theme: theme.id as ThemeId })}
                >
                  <span className="theme-swatch" aria-hidden="true" />
                  <b>{theme.label}</b>
                  <i>{theme.note}</i>
                </button>
              ))}
            </div>
          </section>

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>
                <Star size={15} /> Your reviews, on the wall
              </h3>
              <span className="shop-switch">
                <input
                  type="checkbox"
                  aria-label="Show your reviews on the board"
                  checked={board.reviews.on}
                  onChange={(event) =>
                    onChange({ reviews: { ...board.reviews, on: event.target.checked } })
                  }
                />
                <span />
              </span>
            </div>
            {board.reviews.on && (
              <>
                {board.reviews.items.map((review, index) => (
                  <div className="review-row" key={review.id}>
                    <input
                      value={review.quote}
                      aria-label="Review"
                      placeholder="What they said"
                      onChange={(event) =>
                        onChange({
                          reviews: {
                            ...board.reviews,
                            items: board.reviews.items.map((item, i) =>
                              i === index ? { ...item, quote: event.target.value } : item,
                            ),
                          },
                        })
                      }
                    />
                    <input
                      className="review-who"
                      value={review.author}
                      aria-label="Who said it"
                      placeholder="Name"
                      onChange={(event) =>
                        onChange({
                          reviews: {
                            ...board.reviews,
                            items: board.reviews.items.map((item, i) =>
                              i === index ? { ...item, author: event.target.value } : item,
                            ),
                          },
                        })
                      }
                    />
                    <button
                      type="button"
                      className="edit-drop"
                      aria-label="Remove this review"
                      onClick={() =>
                        onChange({
                          reviews: {
                            ...board.reviews,
                            items: board.reviews.items.filter((_, i) => i !== index),
                          },
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="edit-add"
                  onClick={() =>
                    onChange({
                      reviews: {
                        ...board.reviews,
                        items: [
                          ...board.reviews.items,
                          { id: newId('r'), quote: '', author: '', stars: 5, source: 'Google' },
                        ],
                      },
                    })
                  }
                >
                  Add a review
                </button>
                <p className="prefs-note">
                  Paste your own from Google or Yelp. They run between boards, to a room that is
                  already standing in your shop.
                </p>
              </>
            )}
          </section>

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>
                <Clapperboard size={15} /> Play your own food
              </h3>
              <span className="shop-switch">
                <input
                  type="checkbox"
                  aria-label="Play your own clip between boards"
                  checked={board.media.on}
                  onChange={(event) =>
                    onChange({ media: { ...board.media, on: event.target.checked } })
                  }
                />
                <span />
              </span>
            </div>
            {board.media.on && (
              <>
                <label className="clip-drop">
                  <Upload size={16} />
                  <b>{board.media.name ?? 'Choose a clip'}</b>
                  <span>MP4, up to 8 MB. Muted, on a loop, between boards</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="visually-hidden"
                    onChange={(event) => takeClip(event.target.files?.[0])}
                  />
                </label>
                {board.media.src && (
                  <video className="clip-preview" src={board.media.src} muted loop autoPlay playsInline />
                )}
                {clipError && (
                  <p className="prefs-warn" role="alert">
                    {clipError}
                  </p>
                )}
              </>
            )}
          </section>

          <button type="button" className="edit-add section" onClick={resetBoard}>
            <RotateCcw size={14} /> Start again from the example board
          </button>
        </div>
      </div>

      <div className="shop-preview">
        <div className="preview-head">
          <span>
            On the wall · {SLOTS.find((s) => s.id === slot)?.label}
          </span>
          <i>Updates as you type</i>
        </div>
        <BoardCanvas board={board} slot={slot} />

        <fieldset className="place-pick">
          <legend>Where ads sit on your screen</legend>
          <div className="place-options">
            {PLACEMENTS.map((place) => (
              <button
                key={place.id}
                type="button"
                className={board.adPlacement === place.id ? 'on' : undefined}
                aria-pressed={board.adPlacement === place.id}
                onClick={() => onChange({ adPlacement: place.id })}
              >
                <span className={`place-mini m-${place.id}`} aria-hidden="true">
                  <i />
                </span>
                <b>{place.label}</b>
                <i>{place.note}</i>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="preview-note">
          Nothing here is a contract. Pick nowhere for a week you want the whole screen, and your
          earnings for that week go to zero with it. Every ad still waits for your yes.
        </p>
      </div>
    </section>
  );
}

/* ---- the approval queue -------------------------------------------------- */

function AdsTab({ waiting, campaigns }: { waiting: Campaign[]; campaigns: Campaign[] }) {
  const mine = campaigns.filter((campaign) => campaign.venues.includes(SHOP.id));
  const decided = mine.filter((campaign) => statusOf(campaign) !== 'review');

  return (
    <section className="shop-queue wrap">
      <div className="section-head">
        <h2>Nothing plays until you say so.</h2>
        <p>
          Every creative booked onto your board waits here. Reject anything that does not suit your
          shop, your customers or your values. No explanation is owed to anyone.
        </p>
      </div>

      {waiting.length === 0 ? (
        <p className="queue-empty">
          Nothing is waiting on you. When an advertiser books your board, their artwork lands here
          first. {mine.length === 0 && 'Load the sample campaigns from the advertiser side to see how this reads.'}
        </p>
      ) : (
        <div className="queue-grid">
          {waiting.map((campaign) => {
            const format = FORMATS.find((item) => item.id === campaign.format);
            return (
              <article className="queue-card" key={campaign.id}>
                <div className="queue-head">
                  <b>{campaign.name}</b>
                  <span>Booked {day.format(new Date(campaign.createdAt))}</span>
                </div>
                <dl className="queue-facts">
                  <div>
                    <dt>Format</dt>
                    <dd>{format?.name ?? campaign.format}</dd>
                  </div>
                  <div>
                    <dt>Takes</dt>
                    <dd>{format?.spec}</dd>
                  </div>
                  <div>
                    <dt>From</dt>
                    <dd>{campaign.email ?? 'an advertiser'}</dd>
                  </div>
                </dl>
                {campaign.note && <p className="queue-note">{campaign.note}</p>}
                <div className="queue-art">
                  {campaign.creativeSrc ? (
                    <img src={campaign.creativeSrc} alt={campaign.creativeName ?? 'The creative'} />
                  ) : (
                    <span>{campaign.creativeName ?? 'Artwork on file'}</span>
                  )}
                </div>
                <div className="queue-actions">
                  <button type="button" onClick={() => rejectCampaign(campaign.id)}>
                    <X size={15} /> Reject
                  </button>
                  <button
                    type="button"
                    className="yes"
                    onClick={() => approveCampaign(campaign.id)}
                  >
                    <Check size={15} /> Approve
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <div className="queue-decided">
          <h3>Already decided</h3>
          <ul>
            {decided.map((campaign) => (
              <li key={campaign.id}>
                <b>{campaign.name}</b>
                {statusOf(campaign) === 'live' ? (
                  <span className="status live">On your screen</span>
                ) : (
                  <span className="status gone">Rejected</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---- what the screen pays ------------------------------------------------ */

function MoneyTab({ board, priced }: { board: Board; priced: typeof SHOP }) {
  const week = weeklyEarnings(priced);
  const stock = inventory([priced]);

  return (
    <section className="shop-money wrap">
      <div className="section-head">
        <h2>What the screen pays you.</h2>
        <p>
          Worked from your own hours and where you are letting ads sit. Move that on the board tab
          and every figure here moves with it.
        </p>
      </div>

      <div className="stat-grid">
        <article>
          <small>Paid each week</small>
          <b className="money">{money.format(week)}</b>
          <i>On the cheapest format, so it is a floor</i>
        </article>
        <article>
          <small>A month</small>
          <b className="money">{money.format(monthlyEarnings(priced))}</b>
          <i>Paid once a month, itemised by spot</i>
        </article>
        <article>
          <small>A year at this pace</small>
          <b className="money">{money.format(yearlyEarnings(priced))}</b>
          <i>{SHOP.hours}</i>
        </article>
        <article>
          <small>Ad minutes you are offering</small>
          <b>{count.format(stock.minutes)}</b>
          <i>{placementById(board.adPlacement).short}, across your open week</i>
        </article>
      </div>

      <div className="money-split">
        <h3>Where it comes from</h3>
        {DAYPARTS.map((part) => {
          const pay = daypartEarnings(priced, part.id);
          const most = Math.max(
            ...DAYPARTS.map((other) => daypartEarnings(priced, other.id)),
            0.01,
          );
          return (
            <div className={`money-row ${part.tier}`} key={part.id}>
              <span className="money-when">
                <b>{part.label}</b>
                <i>{part.window}</i>
              </span>
              <span className={`rate-tier ${part.tier}`}>
                {part.tier === 'peak' ? 'Peak' : 'Off-peak'}
              </span>
              <span className="money-bar">
                <i style={{ width: `${Math.max(2, (pay / most) * 100)}%` }} />
              </span>
              <span className="money-figure money">{money.format(pay)}</span>
            </div>
          );
        })}
        <p className="prefs-note">
          Busy hours are worth more and are paid as such. These are your earnings, quoted on the
          cheapest format we sell, so a week where the bigger formats go pays more than this.
        </p>
      </div>

      <aside className="money-aside">
        <Sparkles size={18} />
        <div>
          <b>The screen earns either way.</b>
          <p>
            The board tools are yours whether or not a single ad sells this week. Design it, change
            it at lunch, put your reviews on it. The ads are the part that pays; the board is the
            part that works.
          </p>
        </div>
      </aside>
    </section>
  );
}

/* ---- the TVs --------------------------------------------------------------
   A screen introduces itself with a code; the owner types it once. After
   that the panel is a status board: is it on, when did it last check in,
   which build is it running. The ten-minute figure is the poll interval and
   is the honest answer to "when will my change show up". */
function TvTab() {
  const { ready, devices } = useDevices();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paired, setPaired] = useState(false);

  const pair = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setPaired(false);
    const result = await pairDevice(code, name);
    setBusy(false);
    if (result.ok) {
      setPaired(true);
      setCode('');
      setName('');
    } else {
      setError(result.message);
    }
  };

  return (
    <section className="shop-queue wrap">
      <div className="section-head">
        <h2>Your TVs.</h2>
        <p>
          Open the AdBite Board channel on a Roku and it shows a six-character code. Type it here
          and that screen is yours. Every TV checks for changes every {POLL_MINUTES} minutes, so a
          menu edit or an approved ad takes up to {POLL_MINUTES} minutes to reach the wall.
        </p>
      </div>

      <form className="access-form tv-pair" onSubmit={pair}>
        <div className="form-grid">
          <label htmlFor="tv-code">
            Code on the TV
            <input
              id="tv-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC234"
              maxLength={7}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <label htmlFor="tv-name">
            Call it
            <input id="tv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Counter TV" />
          </label>
        </div>
        <button className="button primary" type="submit" disabled={busy || code.replace(/[^A-Z0-9]/g, '').length < 6}>
          {busy ? 'Pairing…' : 'Pair this TV'}
        </button>
        {error && (
          <p className="form-warn" role="alert">
            {error}
          </p>
        )}
        {paired && <p className="form-note">Paired. Your board is on it within a minute.</p>}
      </form>

      {ready && devices.length === 0 ? (
        <p className="queue-empty">No TVs yet. Pair the first one above.</p>
      ) : (
        <div className="queue-grid">
          {devices.map((device) => (
            <TvCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </section>
  );
}

const when = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function TvCard({ device }: { device: Device }) {
  const online = isOnline(device);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(device.name);

  return (
    <article className="queue-card tv-card">
      <div className="queue-head">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              if (draft.trim() && draft.trim() !== device.name) void renameDevice(device.id, draft.trim());
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          </form>
        ) : (
          <b onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            {device.name}
          </b>
        )}
        <span className={online ? 'tv-on' : 'tv-off'}>{online ? 'On the wall' : 'Not checking in'}</span>
      </div>
      <dl className="queue-facts">
        <div>
          <dt>Last checked in</dt>
          <dd>{device.lastSeen ? when.format(new Date(device.lastSeen)) : 'Never'}</dd>
        </div>
        <div>
          <dt>Shows</dt>
          <dd>{device.screen === 'reel' ? 'Ads only (second screen)' : 'Your menu and ads'}</dd>
        </div>
        <div>
          <dt>Channel</dt>
          <dd>{device.channelVersion ?? 'unknown'}</dd>
        </div>
      </dl>
    </article>
  );
}
