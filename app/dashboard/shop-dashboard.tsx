'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Landmark,
  LayoutTemplate,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Trash2,
  Tv,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SideSwitch } from '@/components/side-switch';
import { BoardCanvas } from '@/components/board/board-canvas';
import { MenuEditor } from '@/components/board/menu-editor';
import {
  ORIENTATIONS,
  PLACEMENTS,
  SLOTS,
  placementById,
  THEMES,
  flushBoard,
  itemCount,
  newId,
  showsMenu,
  resetBoard,
  saveBoard,
  shareOf,
  useBoard,
  type Board,
  type Orientation,
  type SaveState,
  type SlotId,
  type ThemeId,
  BOARD_KINDS,
  BOARD_SOURCES,
  boardKindById,
  type BoardKind,
  type BoardSource,
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
import {
  removeShopMedia,
  setHoldSeconds,
  uploadShopMedia,
  useShopMedia,
  type ShopMedia,
} from '@/lib/shop-media';
import { savePayoutAccount, usePayoutAccount } from '@/lib/payments';
import { useShopStatements } from '@/lib/statements';
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

/** "Sep 15" or "15 sept", depending on the page's language. */
function useDay(options: Intl.DateTimeFormatOptions) {
  const { lang } = useLang();
  return useMemo(() => new Intl.DateTimeFormat(localeOf(lang), options), [lang, options]);
}
const DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const WHEN: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };

type TabId = (typeof TABS)[number]['id'];


export function ShopDashboard() {
  const { ready, board, save } = useBoard();
  const { campaigns } = useCampaigns();
  const [tab, setTab] = useState<TabId>('board');
  const [slot, setSlot] = useState<SlotId>('midday');
  const t = useCopy(COPY);
  const shared = useCopy(SHARED);

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
        <DashboardHeader />
        <div className="campaign-loading" aria-hidden="true" />
      </main>
    );
  }

  /* Asked once, before the editor makes an assumption about what the screen
     is. A shop running a looping film should not be handed an empty menu
     grid and left to work out that it does not apply to them. */
  if (board.kind === null) {
    return (
      <main className="campaign-page shop-page">
        <DashboardHeader />
        <BoardSetup
          onDone={(kind, source) => set({ kind, source })}
        />
      </main>
    );
  }

  return (
    <main className="campaign-page shop-page">
      <DashboardHeader />
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
        <BoardTab board={board} save={save} slot={slot} onSlot={setSlot} onChange={set} />
      )}
      {tab === 'ads' && <AdsTab waiting={waiting} campaigns={campaigns} />}
      {tab === 'money' && <MoneyTab board={board} priced={priced} />}
      {tab === 'tvs' && <TvTab />}
    </main>
  );
}

/* ---- the builder --------------------------------------------------------- */

/* The board writes itself through as you type, which is the right default and
   was also invisible: nothing on the page ever said a price had been kept.
   This says so, and pressing it skips the half-second wait rather than doing
   anything the editor was not already going to do. */
function SaveButton({ save }: { save: SaveState }) {
  const t = useCopy(COPY).save;
  const label =
    save === 'saving' ? t.saving : save === 'saved' ? t.saved : save === 'error' ? t.failed : t.save;

  return (
    <div className={`board-save is-${save}`}>
      <button
        type="button"
        className="button primary"
        disabled={save === 'saving' || save === 'saved'}
        onClick={() => void flushBoard()}
      >
        {save === 'saved' ? <Check size={15} /> : save === 'error' ? <AlertCircle size={15} /> : <Save size={15} />}
        {label}
      </button>
      {save === 'dirty' && <span>{t.unsaved}</span>}
    </div>
  );
}

function BoardTab({
  board,
  save,
  slot,
  onSlot,
  onChange,
}: {
  board: Board;
  save: SaveState;
  slot: SlotId;
  onSlot: (slot: SlotId) => void;
  onChange: (patch: Partial<Board>) => void;
}) {
  const t = useCopy(COPY);
  const shared = useCopy(SHARED);
  /* A display screen has no menu whatever its source says, and a board whose
     owner uploads their own artwork has none either. Both edit and preview
     their media instead; only a typed menu gets the grid. */
  const uploaded = !showsMenu(board);

  return (
    <section className="shop-body">
      <div className="shop-edit">
        {/* The answer to "what is this screen for" decides what this half of
            the page is. A shop that uploads its board has no sections to
            type, and handing them an empty menu grid would be telling them
            their answer did not matter. */}
        <div className="board-kind-row">
          <span>
            {boardKindById(board.kind ?? 'menu').label} ·{' '}
            {BOARD_SOURCES.find((option) => option.id === board.source)?.label}
          </span>
          <button type="button" onClick={() => onChange({ kind: null })}>
            {t.setup.change}
          </button>
        </div>

        <SaveButton save={save} />

        {uploaded ? (
          <div className="shop-scroll">
            <MediaPanel />
          </div>
        ) : (
          <>
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
              <h3>{t.screen.title}</h3>
              <span className="prefs-hint">{t.screen.hint}</span>
            </div>
            <div className="orient-row">
              {ORIENTATIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`orient-chip o-${option.id}${board.orientation === option.id ? ' on' : ''}`}
                  aria-pressed={board.orientation === option.id}
                  onClick={() => onChange({ orientation: option.id as Orientation })}
                >
                  <span className="orient-mini" aria-hidden="true" />
                  <b>{shared.orientations[option.id].label}</b>
                  <i>{shared.orientations[option.id].note}</i>
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

          {/* The shop's own pictures and film. This used to be one clip kept
              as a data URL in this browser, which meant it never reached a
              screen at all; it is now a library that uploads, is re-encoded
              for the TV, and mixes with the ads. */}
          <MediaPanel />

          <button type="button" className="edit-add section" onClick={resetBoard}>
            <RotateCcw size={14} /> {t.reset}
          </button>
        </div>
          </>
        )}
      </div>

      <div className="shop-preview">
        <div className="preview-head">
          <span>
            {t.preview.onTheWall}
            {uploaded ? '' : ` · ${shared.slots[slot].label}`}
          </span>
          <i>{t.preview.updates}</i>
        </div>
        {/* A board the shop uploads has no menu on the wall, so showing one
            here would promise something the screen will not do. */}
        {uploaded ? <MediaPreview board={board} /> : <BoardCanvas board={board} slot={slot} />}

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

/* Where a shop wants paying.
 *
 * Stripe's hosted onboarding is shelved, so this is the form it used to be a
 * redirect to. The account number goes one way only: it is written here and
 * read back as four digits, because the column it lands in is revoked from
 * the role this page runs as. Nothing is held in this component after save. */
function BankPanel() {
  const t = useCopy(COPY).money.bank;
  const shared = useCopy(SHARED);
  const { ready, account } = usePayoutAccount();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');

  const last4 = saved ?? account?.last4 ?? null;
  const show = editing || (ready && !last4);

  return (
    <section className="shop-panel bank-panel">
      <div className="prefs-head">
        <h3>
          <Landmark size={15} /> {t.title}
        </h3>
        <span className="prefs-hint">{t.hint}</span>
      </div>

      {!show && last4 && (
        <div className="bank-set">
          <p>
            <Check size={15} /> {t.saved(last4)}
          </p>
          <button type="button" onClick={() => setEditing(true)}>
            {t.change}
          </button>
        </div>
      )}

      {!show && ready && !last4 && <p className="prefs-note">{t.missing}</p>}

      {show && (
        <form
          className="bank-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setSaving(true);
            setError('');
            const result = await savePayoutAccount({
              accountHolder: String(data.get('holder') ?? ''),
              routingNumber: String(data.get('routing') ?? ''),
              accountNumber: String(data.get('account') ?? ''),
              accountType: (String(data.get('type') ?? 'checking') as 'checking' | 'savings'),
            });
            setSaving(false);
            if (result.ok) {
              setSaved(String(data.get('account') ?? '').replace(/\D/g, '').slice(-4));
              setEditing(false);
            } else {
              setError(result.message);
            }
          }}
        >
          <label className="shop-field">
            {t.holder}
            <input name="holder" required placeholder={t.holderPlaceholder} autoComplete="off" />
          </label>
          <div className="bank-row">
            <label className="shop-field">
              {t.routing}
              <input
                name="routing"
                required
                inputMode="numeric"
                maxLength={11}
                autoComplete="off"
              />
            </label>
            <label className="shop-field">
              {t.account}
              <input
                name="account"
                required
                inputMode="numeric"
                maxLength={20}
                autoComplete="off"
              />
            </label>
            <label className="shop-field">
              {t.type}
              <select name="type" defaultValue="checking">
                <option value="checking">{t.checking}</option>
                <option value="savings">{t.savings}</option>
              </select>
            </label>
          </div>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? t.saving : t.save}
          </button>
          {error && (
            <p className="form-warn" role="alert">
              {error}
            </p>
          )}
          <p className="prefs-note">{t.note}</p>
        </form>
      )}
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
                  {campaign.creativeSrc && campaign.format === 'video' ? (
                    <video src={campaign.creativeSrc} muted loop autoPlay playsInline />
                  ) : campaign.creativeSrc ? (
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
  const statements = useShopStatements();

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
          <small>{t.paid}</small>
          <b className="money">{statements.ready ? money.format(statements.paidCents / 100) : '—'}</b>
          <i>{t.paidNote}</i>
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
            <div className="money-row" key={part.id}>
              <span className="money-when">
                <b>{shared.dayparts[part.id].label}</b>
                <i>{shared.dayparts[part.id].window}</i>
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
      <BankPanel />
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
        {device.storage && (
          <div>
            <dt>{t.storage}</dt>
            <dd>{t.storageValue(device.storage.usedMb, device.storage.freeMb ?? null)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

/* ---- what the screen is ----------------------------------------------------
   Two questions, asked once, in the shop's own words. The first decides what
   the editor puts in front of them; the second decides whether they type
   their board or upload it. Neither changes what they are paid. */
function BoardSetup({ onDone }: { onDone: (kind: BoardKind, source: BoardSource) => void }) {
  const t = useCopy(COPY).setup;
  const [kind, setKind] = useState<BoardKind | null>(null);

  if (kind === null) {
    return (
      <section className="board-setup wrap">
        <div className="section-head">
          <h2>{t.title}</h2>
        </div>
        <div className="setup-grid">
          {BOARD_KINDS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="setup-card"
              onClick={() => {
                /* A display screen has no prices to type, so there is no
                   second question to ask: it is their own media by
                   definition. Asking anyway produced boards whose owner had
                   said "no prices" and was then handed a menu grid. */
                if (option.id === 'display') onDone(option.id, 'media');
                else setKind(option.id);
              }}
            >
              <b>{option.label}</b>
              <span>{option.blurb}</span>
              <i>
                {t.exampleLabel}: {option.example}
              </i>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="board-setup wrap">
      <div className="section-head">
        <h2>{t.sourceTitle}</h2>
        <p>{t.sourceLede}</p>
      </div>
      <div className="setup-grid two">
        {BOARD_SOURCES.map((option) => (
          <button key={option.id} type="button" className="setup-card" onClick={() => onDone(kind, option.id)}>
            <b>{option.label}</b>
            <span>{option.blurb}</span>
          </button>
        ))}
      </div>
      <button type="button" className="dash-add quiet" onClick={() => setKind(null)}>
        {t.back}
      </button>
    </section>
  );
}

/* ---- the shop's own pictures and film --------------------------------------
   Sits beside the menu editor rather than inside it, because it is not part
   of the menu: it is the other thing a screen can be. */
function MediaPanel() {
  const t = useCopy(COPY).media;
  const { media } = useShopMedia();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const take = async (file: File | undefined) => {
    if (!file) return;
    const isVideo = file.type === 'video/mp4';
    const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    if (!isVideo && !isImage) {
      setError(t.notMedia);
      return;
    }
    if (file.size > (isVideo ? 12 : 6) * 1024 * 1024) {
      setError(t.tooBig);
      return;
    }
    setError('');
    setProgress(0.05);
    const result = await uploadShopMedia(file, setProgress);
    setProgress(null);
    if (!result.ok) setError(result.message);
    if (input.current) input.current.value = '';
  };

  return (
    <section className="shop-media">
      <div className="section-head">
        <h2>{t.title}</h2>
        <p>{t.lede}</p>
      </div>

      <div className="media-grid">
        {media.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}

        <button
          type="button"
          className="media-add"
          onClick={() => input.current?.click()}
          disabled={progress !== null}
        >
          {progress !== null ? (
            <>
              <Upload size={22} />
              <b>{t.uploading}</b>
              <span className="upload-bar">
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
            </>
          ) : (
            <>
              <Upload size={22} />
              <b>{t.add}</b>
              <span>{t.dropSub}</span>
            </>
          )}
        </button>
      </div>

      {media.length === 0 && progress === null && <p className="queue-empty">{t.empty}</p>}
      {error && (
        <p className="form-warn" role="alert">
          {error}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4"
        className="visually-hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />
    </section>
  );
}

function MediaCard({ item }: { item: ShopMedia }) {
  const t = useCopy(COPY).media;
  return (
    <figure className={`media-card${item.ready ? '' : ' working'}`}>
      <div className="media-art">
        {!item.ready ? (
          <span className="media-working">{t.processing}</span>
        ) : item.kind === 'video' ? (
          <video src={item.url ?? undefined} muted loop autoPlay playsInline />
        ) : (
          <img src={item.url ?? undefined} alt={item.name} />
        )}
      </div>
      <figcaption>
        <b>{item.name}</b>
        {item.kind === 'video' ? (
          <span>{item.seconds ? `${Math.round(item.seconds)}s` : ''}</span>
        ) : (
          <label className="media-hold">
            {t.holdFor}
            <input
              type="number"
              min={2}
              max={60}
              defaultValue={item.holdSeconds}
              onBlur={(event) => void setHoldSeconds(item.id, Number(event.target.value))}
            />
            {t.seconds}
          </label>
        )}
        <button type="button" onClick={() => void removeShopMedia(item.id)}>
          <Trash2 size={13} /> {t.remove}
        </button>
      </figcaption>
      {!item.ready && <span className="media-note">{t.processingNote}</span>}
    </figure>
  );
}

/* What an uploaded board actually looks like: the shop's own media in the
   order it will play, with the approved advertising folded into the same
   rotation. It cycles so the page shows the thing rather than describing it. */
/* The screen, actually playing.
 *
 * This used to be a still: one item, no rotation unless there were two or
 * more, and a timer whose effect depended on an array rebuilt on every render.
 * Since the editor is typing next to it, every keystroke handed that effect a
 * new array, which cleared the pending timeout and started it again -- so on
 * a board anybody was editing the preview never advanced at all. The list is
 * keyed on its ids now, videos advance on their own `ended` rather than a
 * guessed duration, and one item loops rather than freezing.
 *
 * It also draws the ad slot the shop has sold, because what the wall plays is
 * their media *and* the spots in it, and a preview that leaves the ads out is
 * a preview of something else. */
function MediaPreview({ board }: { board: Board }) {
  const t = useCopy(COPY).media;
  const shared = useCopy(SHARED);
  const { media } = useShopMedia();
  const [at, setAt] = useState(0);

  const screen = useRef<HTMLVideoElement | null>(null);
  const ready = useMemo(() => media.filter((item) => item.ready), [media]);
  /* The identity that matters is which items are in the rotation, not which
     array instance the last render happened to build. */
  const rotation = ready.map((item) => item.id).join(',');
  const item = ready.length ? ready[at % ready.length] : null;

  /* Back to the top if the rotation changes underneath the index. */
  useEffect(() => {
    setAt(0);
  }, [rotation]);

  const advance = () => setAt((was) => was + 1);

  /* `autoPlay` alone does not start these. React assigns `muted` as a property
     after the element exists, and Chrome decides whether a video may autoplay
     from the attribute it sees at creation, so an unmuted-looking video is
     blocked and just sits there at readyState 0 -- which is exactly what the
     preview was doing: the right file, loaded never, painted black. Setting
     muted on the node and asking it to play is the same thing the board reel
     on the marketing page already does. */
  useEffect(() => {
    const node = screen.current;
    if (!node) return;
    node.muted = true;
    const start = () => void node.play().catch(() => {});
    start();
    node.addEventListener('loadeddata', start);
    return () => node.removeEventListener('loadeddata', start);
  }, [at, rotation]);

  useEffect(() => {
    if (!item) return;
    /* A video says when it is done; only a still needs a clock. A one-item
       rotation still advances, which for a video means it plays again. */
    if (item.kind === 'video') return;
    const hold = Math.max(2, item.holdSeconds || 8) * 1000;
    const timer = setTimeout(advance, hold);
    return () => clearTimeout(timer);
  }, [at, rotation, item?.id, item?.kind, item?.holdSeconds]);

  if (!item) {
    return (
      <div className="board-canvas-frame media-preview empty">
        <span>{t.empty}</span>
      </div>
    );
  }

  const place = placementById(board.adPlacement);
  const orientation = board.orientation ?? 'landscape';

  return (
    <div className={`media-preview-wrap orient-${orientation} place-${place.id}`}>
      <div className="board-canvas-frame media-preview">
        {item.kind === 'video' ? (
          <video
            key={item.id}
            ref={screen}
            src={item.url ?? undefined}
            poster={item.posterUrl ?? undefined}
            muted
            autoPlay
            preload="auto"
            playsInline
            /* One item on its own loops; more than one hands over. */
            loop={ready.length === 1}
            onEnded={() => {
              if (ready.length > 1) advance();
            }}
          />
        ) : (
          <img key={item.id} src={item.url ?? undefined} alt={item.name} />
        )}

        {/* Where the ads sit, drawn on the media the way they sit on the wall. */}
        {(place.id === 'rail' || place.id === 'banner') && (
          <aside className="media-ad">
            <b>{shared.board.adSpace}</b>
            <i>{shared.placements[place.id].label}</i>
          </aside>
        )}

        <span className="media-preview-name">{item.name}</span>
      </div>

      {/* Where you are in the loop, so a still preview is legibly a rotation. */}
      {ready.length > 1 && (
        <div className="media-dots" aria-hidden="true">
          {ready.map((entry, index) => (
            <i key={entry.id} className={index === at % ready.length ? 'on' : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
