'use client';

import { useMemo, useState } from 'react';
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
import { localeOf, useCopy, useLang } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';
import { SHOP as COPY } from '@/lib/copy/shop';

const SHOP = LIVE_VENUES[0];

/* The nav and the tabs read their words from lib/copy/shop.ts; the ids and
   icons live here. */
const TABS = [
  { id: 'board', icon: LayoutTemplate },
  { id: 'ads', icon: Check },
  { id: 'money', icon: Wallet },
  { id: 'tvs', icon: Tv },
] as const;

function useNav() {
  const t = useCopy(SHARED);
  return [
    { href: '/advertisers', label: t.nav.forAdvertisers },
    { href: '/', label: t.nav.forShops },
    { href: '/faq', label: t.nav.faq },
  ];
}

/** "Sep 15" or "15 sept", depending on the page's language. */
function useDay(options: Intl.DateTimeFormatOptions) {
  const { lang } = useLang();
  return useMemo(() => new Intl.DateTimeFormat(localeOf(lang), options), [lang, options]);
}
const DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const WHEN: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };

type TabId = (typeof TABS)[number]['id'];

const MAX_CLIP = 8 * 1024 * 1024;

export function ShopDashboard() {
  const { ready, board } = useBoard();
  const { campaigns } = useCampaigns();
  const [tab, setTab] = useState<TabId>('board');
  const [slot, setSlot] = useState<SlotId>('midday');
  const t = useCopy(COPY);
  const shared = useCopy(SHARED);
  const NAV = useNav();

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
              <span className="pulse" /> {board.shopName || shared.board.yourShop}
            </span>
            <h1>{t.head.yourScreen}</h1>
          </div>
          <dl className="dash-totals">
            <div>
              <dt>{t.head.onTheBoard}</dt>
              <dd>{itemCount(board)}</dd>
            </div>
            <div>
              <dt>{t.head.adsSit}</dt>
              <dd>{shared.placements[board.adPlacement].short}</dd>
            </div>
            <div>
              <dt>{t.head.waitingOnYou}</dt>
              <dd>{waiting.length}</dd>
            </div>
            <div>
              <dt>{t.head.youArePaid}</dt>
              <dd className="money">{money.format(weeklyEarnings(priced))} {t.head.perWeek}</dd>
            </div>
          </dl>
          <SideSwitch />
          <nav className="tabs head-tabs" aria-label={t.head.workspace}>
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'on' : undefined}
                aria-current={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                <item.icon size={14} /> {t.tabs[item.id]}
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
  const t = useCopy(COPY);
  const shared = useCopy(SHARED);
  const [clipError, setClipError] = useState('');

  const takeClip = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setClipError(t.clip.notVideo);
      return;
    }
    if (file.size > MAX_CLIP) {
      setClipError(t.clip.tooBig);
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
        <div className="slot-tabs" role="tablist" aria-label={t.editor.whichBoard}>
          {SLOTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={slot === item.id}
              className={slot === item.id ? 'on' : undefined}
              onClick={() => onSlot(item.id)}
            >
              <b>{shared.slots[item.id].label}</b>
              <i>{shared.slots[item.id].window}</i>
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
              <h3>{t.shop.title}</h3>
              <span className="prefs-hint">{t.shop.hint}</span>
            </div>
            <label className="shop-field">
              {t.shop.name}
              <input
                value={board.shopName}
                onChange={(event) => onChange({ shopName: event.target.value })}
              />
            </label>
            <label className="shop-field">
              {t.shop.tagline}
              <input
                value={board.tagline}
                placeholder={t.shop.taglinePlaceholder}
                onChange={(event) => onChange({ tagline: event.target.value })}
              />
            </label>
          </section>

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>{t.look.title}</h3>
              <span className="prefs-hint">{t.look.hint}</span>
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
                  <b>{shared.themes[theme.id].label}</b>
                  <i>{shared.themes[theme.id].note}</i>
                </button>
              ))}
            </div>
          </section>

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>
                <Star size={15} /> {t.reviews.title}
              </h3>
              <span className="shop-switch">
                <input
                  type="checkbox"
                  aria-label={t.reviews.toggle}
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
                      aria-label={t.reviews.review}
                      placeholder={t.reviews.quotePlaceholder}
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
                      aria-label={t.reviews.who}
                      placeholder={t.reviews.namePlaceholder}
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
                      aria-label={t.reviews.remove}
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
                  {t.reviews.add}
                </button>
                <p className="prefs-note">{t.reviews.note}</p>
              </>
            )}
          </section>

          <section className="shop-panel">
            <div className="prefs-head">
              <h3>
                <Clapperboard size={15} /> {t.clip.title}
              </h3>
              <span className="shop-switch">
                <input
                  type="checkbox"
                  aria-label={t.clip.toggle}
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
                  <b>{board.media.name ?? t.clip.choose}</b>
                  <span>{t.clip.spec}</span>
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
            <RotateCcw size={14} /> {t.reset}
          </button>
        </div>
      </div>

      <div className="shop-preview">
        <div className="preview-head">
          <span>
            {t.preview.onTheWall} · {shared.slots[slot].label}
          </span>
          <i>{t.preview.updates}</i>
        </div>
        <BoardCanvas board={board} slot={slot} />

        <fieldset className="place-pick">
          <legend>{t.preview.where}</legend>
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
                <b>{shared.placements[place.id].label}</b>
                <i>{shared.placements[place.id].note}</i>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="preview-note">{t.preview.note}</p>
      </div>
    </section>
  );
}

/* ---- the approval queue -------------------------------------------------- */

function AdsTab({ waiting, campaigns }: { waiting: Campaign[]; campaigns: Campaign[] }) {
  const t = useCopy(COPY).queue;
  const shared = useCopy(SHARED);
  const day = useDay(DAY);
  const mine = campaigns.filter((campaign) => campaign.venues.includes(SHOP.id));
  const decided = mine.filter((campaign) => statusOf(campaign) !== 'review');

  return (
    <section className="shop-queue wrap">
      <div className="section-head">
        <h2>{t.title}</h2>
        <p>{t.lede}</p>
      </div>

      {waiting.length === 0 ? (
        <p className="queue-empty">
          {t.empty} {mine.length === 0 && t.emptySamples}
        </p>
      ) : (
        <div className="queue-grid">
          {waiting.map((campaign) => {
            const format = FORMATS.find((item) => item.id === campaign.format);
            return (
              <article className="queue-card" key={campaign.id}>
                <div className="queue-head">
                  <b>{campaign.name}</b>
                  <span>{t.booked(day.format(new Date(campaign.createdAt)))}</span>
                </div>
                <dl className="queue-facts">
                  <div>
                    <dt>{t.format}</dt>
                    <dd>{format ? shared.formats[format.id].name : campaign.format}</dd>
                  </div>
                  <div>
                    <dt>{t.takes}</dt>
                    <dd>{format ? shared.formats[format.id].spec : ''}</dd>
                  </div>
                  <div>
                    <dt>{t.from}</dt>
                    <dd>{campaign.email ?? t.anAdvertiser}</dd>
                  </div>
                </dl>
                {campaign.note && <p className="queue-note">{campaign.note}</p>}
                <div className="queue-art">
                  {campaign.creativeSrc ? (
                    <img src={campaign.creativeSrc} alt={campaign.creativeName ?? t.theCreative} />
                  ) : (
                    <span>{campaign.creativeName ?? t.onFile}</span>
                  )}
                </div>
                <div className="queue-actions">
                  <button type="button" onClick={() => rejectCampaign(campaign.id)}>
                    <X size={15} /> {t.reject}
                  </button>
                  <button
                    type="button"
                    className="yes"
                    onClick={() => approveCampaign(campaign.id)}
                  >
                    <Check size={15} /> {t.approve}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <div className="queue-decided">
          <h3>{t.decided}</h3>
          <ul>
            {decided.map((campaign) => (
              <li key={campaign.id}>
                <b>{campaign.name}</b>
                {statusOf(campaign) === 'live' ? (
                  <span className="status live">{t.onScreen}</span>
                ) : (
                  <span className="status gone">{t.rejected}</span>
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
  const t = useCopy(COPY).money;
  const shared = useCopy(SHARED);
  const week = weeklyEarnings(priced);
  const stock = inventory([priced]);

  return (
    <section className="shop-money wrap">
      <div className="section-head">
        <h2>{t.title}</h2>
        <p>{t.lede}</p>
      </div>

      <div className="stat-grid">
        <article>
          <small>{t.week}</small>
          <b className="money">{money.format(week)}</b>
          <i>{t.weekNote}</i>
        </article>
        <article>
          <small>{t.month}</small>
          <b className="money">{money.format(monthlyEarnings(priced))}</b>
          <i>{t.monthNote}</i>
        </article>
        <article>
          <small>{t.year}</small>
          <b className="money">{money.format(yearlyEarnings(priced))}</b>
          <i>{SHOP.hours}</i>
        </article>
        <article>
          <small>{t.minutes}</small>
          <b>{count.format(stock.minutes)}</b>
          <i>{t.minutesNote(shared.placements[board.adPlacement].short)}</i>
        </article>
      </div>

      <div className="money-split">
        <h3>{t.where}</h3>
        {DAYPARTS.map((part) => {
          const pay = daypartEarnings(priced, part.id);
          const most = Math.max(
            ...DAYPARTS.map((other) => daypartEarnings(priced, other.id)),
            0.01,
          );
          return (
            <div className={`money-row ${part.tier}`} key={part.id}>
              <span className="money-when">
                <b>{shared.dayparts[part.id].label}</b>
                <i>{shared.dayparts[part.id].window}</i>
              </span>
              <span className={`rate-tier ${part.tier}`}>
                {shared.tier[part.tier]}
              </span>
              <span className="money-bar">
                <i style={{ width: `${Math.max(2, (pay / most) * 100)}%` }} />
              </span>
              <span className="money-figure money">{money.format(pay)}</span>
            </div>
          );
        })}
        <p className="prefs-note">{t.note}</p>
      </div>

      <aside className="money-aside">
        <Sparkles size={18} />
        <div>
          <b>{t.eitherWay}</b>
          <p>{t.eitherWayText}</p>
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
  const t = useCopy(COPY).tvs;
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
        <h2>{t.title}</h2>
        <p>{t.lede(POLL_MINUTES)}</p>
      </div>

      <form className="access-form tv-pair" onSubmit={pair}>
        <div className="form-grid">
          <label htmlFor="tv-code">
            {t.code}
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
            {t.callIt}
            <input id="tv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.callItPlaceholder} />
          </label>
        </div>
        <button className="button primary" type="submit" disabled={busy || code.replace(/[^A-Z0-9]/g, '').length < 6}>
          {busy ? t.pairing : t.pair}
        </button>
        {error && (
          <p className="form-warn" role="alert">
            {error}
          </p>
        )}
        {paired && <p className="form-note">{t.paired}</p>}
      </form>

      {ready && devices.length === 0 ? (
        <p className="queue-empty">{t.none}</p>
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

function TvCard({ device }: { device: Device }) {
  const t = useCopy(COPY).tvs;
  const when = useDay(WHEN);
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
          <b onDoubleClick={() => setEditing(true)} title={t.rename}>
            {device.name}
          </b>
        )}
        <span className={online ? 'tv-on' : 'tv-off'}>{online ? t.onTheWall : t.notCheckingIn}</span>
      </div>
      <dl className="queue-facts">
        <div>
          <dt>{t.lastSeen}</dt>
          <dd>{device.lastSeen ? when.format(new Date(device.lastSeen)) : t.never}</dd>
        </div>
        <div>
          <dt>{t.shows}</dt>
          <dd>{device.screen === 'reel' ? t.adsOnly : t.menuAndAds}</dd>
        </div>
        <div>
          <dt>{t.channel}</dt>
          <dd>{device.channelVersion ?? t.unknown}</dd>
        </div>
      </dl>
    </article>
  );
}
