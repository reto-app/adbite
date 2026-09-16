'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Hourglass,
  Mail,
  Plus,
  Radio,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { CreativeStep, type Creative } from '@/components/campaign/creative-step';
import {
  DEFAULT_PLACEMENT,
  PlaceStep,
  chosenVenues,
  type Placement,
} from '@/components/campaign/place-step';
import { SpendStep } from '@/components/campaign/spend-step';
import { AnalyticsPanel } from '@/components/campaign/analytics-panel';
import { FORMATS, type FormatId } from '@/lib/boards';
import { LIVE_VENUES, VENUES, totalScreens } from '@/lib/network';
import {
  DAYPARTS,
  cents as rate,
  count,
  inventory,
  money,
  rateFor,
  unitOf,
  type Daypart,
} from '@/lib/pricing';
import {
  addCampaign,
  beginPaymentSetup,
  campaignMinutes,
  clearSamples,
  hasSamples,
  loadSamples,
  removeCampaign,
  statusOf,
  useCampaigns,
  type Campaign,
} from '@/lib/campaigns';
import { totalsOf } from '@/lib/delivery';
import { usePlays } from '@/lib/plays';
import { useAdvertiserStatements } from '@/lib/statements';
import { SideSwitch } from '@/components/side-switch';
import { localeOf, useCopy, useLang } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';

function useNav() {
  const t = useCopy(SHARED);
  return [
    { href: '/advertisers', label: t.nav.forAdvertisers },
    { href: '/', label: t.nav.forShops },
    { href: '/faq', label: t.nav.faq },
  ];
}

function useDay() {
  const { lang } = useLang();
  return useMemo(
    () => new Intl.DateTimeFormat(localeOf(lang), { month: 'short', day: 'numeric' }),
    [lang],
  );
}

/* Place comes first now. It used to be second, which meant the spend slider
   was priced against a network you had not chosen yet and its ceiling jumped
   under you the moment you did. The step names are in lib/copy/campaign.ts. */
const STEP_NUMBERS = ['01', '02', '03'];

/* The name a campaign is filed under is data, not display, and stays English
   so the shop's queue and the mail read the same row. */
function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}

/* ---- the creation suite, opened by the New campaign button ---------------
   The whole builder is one screen tall: head, stepper, a body that scrolls
   inside itself if a step is taller than the room it has, and a bar pinned to
   the bottom. It used to be a long page with a sticky footer, so the summary
   you were deciding against sat below three screens of controls. */

function NewCampaign({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useCopy(CAMPAIGN).dash;
  const shared = useCopy(SHARED);
  const day = useDay();
  const [step, setStep] = useState(0);
  const [spend, setSpend] = useState(60);
  const [dayparts, setDayparts] = useState<Daypart[]>(DAYPARTS.map((part) => part.id));
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [format, setFormat] = useState<FormatId>('banner');
  const [creative, setCreative] = useState<Creative | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const chosen = chosenVenues(placement);
  const booking = { venues: placement.venues, dayparts, weeklySpend: spend, format };
  const minutes = campaignMinutes(booking);
  const byPlay = unitOf(format) === 'play';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const blocked =
    (step === 0 && chosen.length === 0) || (step === 2 && (!creative || !emailOk || sending));

  /* A booking is a row now, not a note to us: it lands in the database, the
     shop sees it in their queue, and api/notify mails both sides. It used to
     also go to info@ as a lead, which was the pilot's only record of it and
     is now a second copy of something nobody needs to read. */
  const save = async () => {
    setSending(true);
    setError('');
    try {
      const saved = await addCampaign({
        name: `${formatName(format)} · ${day.format(new Date())}`,
        weeklySpend: spend,
        format,
        venues: placement.venues,
        ages: placement.ages,
        dayparts,
        creativeName: creative?.name ?? null,
        creativeSrc: creative?.src ?? null,
        creativeId: creative?.creativeId ?? null,
        email: email.trim(),
        startedAt: null,
      });
      await beginPaymentSetup(saved.id);
      return;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t.send.couldNotSave);
      return;
    } finally {
      setSending(false);
    }
    onDone();
  };

  return (
    <div className="builder">
      <div className="campaign-head">
        <div className="wrap campaign-head-inner">
          <div className="campaign-head-row">
            <button type="button" className="head-back" onClick={onCancel}>
              <ArrowLeft size={15} /> {t.back}
            </button>
            <h1>{t.newCampaign}</h1>
          </div>
          <ol className="stepper">
            {t.steps.map((item, index) => (
              <li key={STEP_NUMBERS[index]} className={index === step ? 'on' : index < step ? 'done' : ''}>
                <button type="button" onClick={() => index <= step && setStep(index)}>
                  <span className="stepper-n">{index < step ? <Check size={15} /> : STEP_NUMBERS[index]}</span>
                  <span className="stepper-text">
                    <b>{item.title}</b>
                    <small>{item.note}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="campaign-body">
        <div className="wrap campaign-body-inner">
          {step === 0 && <PlaceStep placement={placement} onChange={setPlacement} />}
          {step === 1 && (
            <SpendStep
              spend={spend}
              onChange={setSpend}
              dayparts={dayparts}
              onDayparts={setDayparts}
              format={format}
              onFormat={setFormat}
              venues={chosen}
            />
          )}
          {step === 2 && (
            <div className="make-step">
              <CreativeStep format={format} creative={creative} onCreative={setCreative} />
              <section className="send-block">
                <div className="prefs-head">
                  <h3>{t.send.title}</h3>
                  <span className="prefs-hint">{t.send.hint}</span>
                </div>
                <label className="send-field" htmlFor="campaign-email">
                  {t.send.email}
                  <span className="field">
                    <Mail size={16} />
                    <input
                      id="campaign-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={t.send.emailPlaceholder}
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError('');
                      }}
                    />
                  </span>
                </label>
                <p className="send-note">{t.send.note}</p>
                {error && (
                  <p className="prefs-warn" role="alert">
                    {error}
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="campaign-bar">
        <div className="wrap campaign-bar-inner">
          <dl className="bar-summary">
            <div>
              <dt>{t.bar.perWeek(byPlay ? shared.unit.plays : shared.unit.minutes)}</dt>
              <dd>{count.format(byPlay ? minutes * 4 : minutes)}</dd>
            </div>
            <div>
              <dt>{t.bar.spend}</dt>
              <dd className="money">{money.format(spend)}</dd>
            </div>
            <div>
              <dt>{t.bar.shops}</dt>
              <dd>{chosen.length || '0'}</dd>
            </div>
            <div>
              <dt>{t.bar.format}</dt>
              <dd className="bar-word">{shared.formats[format].name}</dd>
            </div>
            <div className="bar-rate">
              <dt>{t.bar.rate}</dt>
              <dd>{t.bar.rateLine(rate.format(rateFor(format, 'lunch')), rate.format(rateFor(format, 'afternoon')))}</dd>
            </div>
          </dl>
          <div className="bar-actions">
            {blocked && !sending && (
              <span className="bar-warn">
                {step === 0 ? t.bar.pickOne : !creative ? t.bar.upload : t.bar.addEmail}
              </span>
            )}
            <button
              type="button"
              className="button ghost"
              onClick={() => (step > 0 ? setStep(step - 1) : onCancel())}
            >
              <ArrowLeft size={16} /> {step > 0 ? t.bar.back : t.bar.cancel}
            </button>
            <button
              type="button"
              className="button invert"
              data-track={step === 2 ? 'campaign-submit' : 'campaign-next'}
              disabled={blocked}
              onClick={() => (step < 2 ? setStep(step + 1) : void save())}
            >
              {step === 2 ? (sending ? shared.form.sending : t.bar.submit) : t.bar.next}{' '}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- the campaign the dashboard is showing ------------------------------ */

function StatusTag({ campaign }: { campaign: Campaign }) {
  const t = useCopy(CAMPAIGN).dash.status;
  return statusOf(campaign) === 'live' ? (
    <span className="status live">
      <Radio size={13} /> {t.onScreen}
    </span>
  ) : (
    <span className="status review">
      <Hourglass size={13} /> {t.inReview}
    </span>
  );
}

function CampaignDetail({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const t = useCopy(CAMPAIGN).dash;
  const day = useDay();
  const { byCampaign } = usePlays();
  const totals = totalsOf(campaign, byCampaign[campaign.id]);
  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <span className="detail-tags-row">
            <StatusTag campaign={campaign} />
            {campaign.sample && (
              <span className="status sample">
                <Sparkles size={12} /> {t.status.sample}
              </span>
            )}
          </span>
          <h2>{campaign.name}</h2>
          <p>
            {t.detail.booked(day.format(new Date(campaign.createdAt)))}
            {campaign.startedAt ? t.detail.playingSince(day.format(new Date(campaign.startedAt))) : ''}
            {campaign.note ? ` · ${campaign.note}` : ''}
          </p>
        </div>
        <button type="button" className="detail-delete" onClick={onDelete}>
          <Trash2 size={15} /> {t.detail.delete}
        </button>
      </div>

      {/* The banner says "nothing has played yet", so it follows the figures
          rather than the approval: a campaign a shop approved this morning is
          still a forecast until a screen reports its first spot. */}
      {totals.source === 'model' && <p className="detail-banner">{t.detail.banner}</p>}

      <AnalyticsPanel
        booking={campaign}
        creativeName={campaign.creativeName}
        creativeSrc={campaign.creativeSrc}
        measured={byCampaign[campaign.id]}
      />
    </div>
  );
}

/* ---- the dashboard ------------------------------------------------------ */

/* The builder used to sit behind a sign-in whose only credential was hardcoded
   and never shown to anyone, so every advertiser CTA on the site ended at a
   door that could not open. Nothing in here needs a server or a session: the
   campaigns live in this browser. It is open, and the email is asked for at
   submit, which is also the moment intent is highest. */
export function AdvertiserDashboard() {
  const t = useCopy(CAMPAIGN).dash;
  const NAV = useNav();
  const { ready: listReady, campaigns } = useCampaigns();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const active = useMemo(
    () => campaigns.find((campaign) => campaign.id === selected) ?? campaigns[0],
    [campaigns, selected],
  );

  const { byCampaign: plays } = usePlays();
  const statements = useAdvertiserStatements();
  const weekly = campaigns.reduce((total, campaign) => total + campaign.weeklySpend, 0);
  const minutes = campaigns.reduce((total, campaign) => total + campaignMinutes(campaign), 0);
  const running = campaigns.filter((campaign) => statusOf(campaign) === 'live').length;
  const spent = campaigns.reduce((total, campaign) => total + totalsOf(campaign, plays[campaign.id]).spend, 0);

  if (creating) {
    return (
      <main className="campaign-page building">
        <SiteHeader nav={NAV} />
        <NewCampaign onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </main>
    );
  }

  return (
    <main className="campaign-page">
      <SiteHeader nav={NAV} />

      <div className="dash-head">
        <div className="wrap dash-head-inner">
          <div>
            <span className="eyebrow">
              <span className="pulse" /> {t.head.advertiser}
            </span>
            <h1>{t.head.title}</h1>
          </div>
          <dl className="dash-totals">
            <div>
              <dt>{t.head.onScreen}</dt>
              <dd>{listReady ? `${running} / ${campaigns.length}` : '—'}</dd>
            </div>
            <div>
              <dt>{t.head.weeklySpend}</dt>
              <dd className="money">{listReady ? money.format(weekly) : '—'}</dd>
            </div>
            <div>
              <dt>{t.head.spentToDate}</dt>
              <dd className="money">{statements.ready ? money.format(statements.paidCents / 100) : listReady ? money.format(spent) : '—'}</dd>
            </div>
            <div>
              <dt>{t.head.minutesPerWeek}</dt>
              <dd>{listReady ? count.format(minutes) : '—'}</dd>
            </div>
            <div>
              <dt>{t.head.screensReachable}</dt>
              <dd>{totalScreens()}</dd>
            </div>
          </dl>
          <div className="dash-head-actions">
            <SideSwitch />
            <button type="button" className="button invert" onClick={() => setCreating(true)}>
              <Plus size={17} /> {t.newCampaign}
            </button>
          </div>
        </div>
      </div>

      <section className="dash">
        <aside className="dash-list" aria-label={t.list.label}>
          <div className="dash-list-scroll">
            {campaigns.map((campaign) => {
              const stats = totalsOf(campaign, plays[campaign.id]);
              return (
                <button
                  key={campaign.id}
                  type="button"
                  className={`dash-item${active?.id === campaign.id ? ' on' : ''}`}
                  onClick={() => setSelected(campaign.id)}
                >
                  <span className="dash-item-top">
                    <b>{campaign.name}</b>
                    <i>{money.format(campaign.weeklySpend)}</i>
                  </span>
                  <span className="dash-item-meta">
                    {t.list.meta(
                      campaign.venues.length,
                      count.format(campaignMinutes(campaign)),
                      stats.running ? money.format(stats.spend) : null,
                    )}
                  </span>
                  <span className="dash-item-tags">
                    <StatusTag campaign={campaign} />
                    {campaign.sample && <span className="status sample">{t.status.sample}</span>}
                  </span>
                </button>
              );
            })}
            <button type="button" className="dash-add" onClick={() => setCreating(true)}>
              <Plus size={15} /> {t.newCampaign}
            </button>
            {listReady && hasSamples(campaigns) && (
              <button type="button" className="dash-add quiet" onClick={clearSamples}>
                <Trash2 size={14} /> {t.list.removeSamples}
              </button>
            )}
          </div>
        </aside>

        <div className="dash-main">
          {!listReady ? (
            <div className="campaign-loading" aria-hidden="true" />
          ) : active ? (
            <CampaignDetail
              campaign={active}
              onDelete={() => {
                void removeCampaign(active.id);
                setSelected(null);
              }}
            />
          ) : (
            <div className="dash-empty">
              <Bite className="bite" />
              <h2>{t.empty.title}</h2>
              <p>
                {t.empty.text(
                  LIVE_VENUES.length,
                  count.format(inventory(LIVE_VENUES).minutes),
                  VENUES.length - LIVE_VENUES.length,
                )}
              </p>
              <div className="dash-empty-actions">
                <button type="button" className="button primary" onClick={() => setCreating(true)}>
                  <Plus size={17} /> {t.newCampaign}
                </button>
                <button type="button" className="button ghost" onClick={loadSamples}>
                  <Sparkles size={16} /> {t.empty.samples}
                </button>
              </div>
              <p className="dash-empty-note">{t.empty.note}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
