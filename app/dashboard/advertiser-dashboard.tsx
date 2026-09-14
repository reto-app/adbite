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
import { CreativeStep } from '@/components/campaign/creative-step';
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
import { SideSwitch } from '@/components/side-switch';
import { submitLead } from '@/lib/leads';

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const NAV = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
];

/* Place comes first now. It used to be second, which meant the spend slider
   was priced against a network you had not chosen yet and its ceiling jumped
   under you the moment you did. */
const STEPS = [
  { n: '01', title: 'Place it', note: 'Shops, groups and map' },
  { n: '02', title: 'Price it', note: 'Shape, timing and spend' },
  { n: '03', title: 'Make it', note: 'Artwork and previews' },
];

function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}

/* ---- the creation suite, opened by the New campaign button ---------------
   The whole builder is one screen tall: head, stepper, a body that scrolls
   inside itself if a step is taller than the room it has, and a bar pinned to
   the bottom. It used to be a long page with a sticky footer, so the summary
   you were deciding against sat below three screens of controls. */

function NewCampaign({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [spend, setSpend] = useState(60);
  const [dayparts, setDayparts] = useState<Daypart[]>(DAYPARTS.map((part) => part.id));
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [format, setFormat] = useState<FormatId>('banner');
  const [creative, setCreative] = useState<{ name: string; src: string } | null>(null);
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

  const save = async () => {
    setSending(true);
    setError('');
    const sent = await submitLead({
      kind: 'campaign',
      email: email.trim(),
      detail: {
        weeklySpend: spend,
        minutes,
        dayparts,
        format: formatName(format),
        venues: chosen.map((venue) => venue.name),
        creative: creative?.name ?? null,
      },
    });
    setSending(false);
    if (!sent.ok) {
      setError(sent.message);
      return;
    }
    addCampaign({
      name: `${formatName(format)} · ${day.format(new Date())}`,
      weeklySpend: spend,
      format,
      venues: placement.venues,
      ages: placement.ages,
      dayparts,
      creativeName: creative?.name ?? null,
      creativeSrc: creative?.src ?? null,
      email: email.trim(),
      startedAt: null,
    });
    onDone();
  };

  return (
    <div className="builder">
      <div className="campaign-head">
        <div className="wrap campaign-head-inner">
          <div className="campaign-head-row">
            <button type="button" className="head-back" onClick={onCancel}>
              <ArrowLeft size={15} /> Dashboard
            </button>
            <h1>New campaign</h1>
          </div>
          <ol className="stepper">
            {STEPS.map((item, index) => (
              <li key={item.n} className={index === step ? 'on' : index < step ? 'done' : ''}>
                <button type="button" onClick={() => index <= step && setStep(index)}>
                  <span className="stepper-n">{index < step ? <Check size={15} /> : item.n}</span>
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
                  <h3>Send it to us</h3>
                  <span className="prefs-hint">A person picks this up, not a queue.</span>
                </div>
                <label className="send-field" htmlFor="campaign-email">
                  Your email
                  <span className="field">
                    <Mail size={16} />
                    <input
                      id="campaign-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@yourshop.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError('');
                      }}
                    />
                  </span>
                </label>
                <p className="send-note">
                  AdBite is in pilot, so this goes to info@adbite.site as a request rather than
                  booking the week outright. Nothing is charged now, the shop owner reviews your
                  creative before anything runs, and you only ever pay for what actually plays.
                </p>
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
              <dt>{byPlay ? 'Plays' : 'Minutes'} / week</dt>
              <dd>{count.format(byPlay ? minutes * 4 : minutes)}</dd>
            </div>
            <div>
              <dt>Spend</dt>
              <dd className="money">{money.format(spend)}</dd>
            </div>
            <div>
              <dt>Shops</dt>
              <dd>{chosen.length || '0'}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd className="bar-word">{formatName(format)}</dd>
            </div>
            <div className="bar-rate">
              <dt>Rate</dt>
              <dd>
                {rate.format(rateFor(format, 'lunch'))} peak ·{' '}
                {rate.format(rateFor(format, 'afternoon'))} off
              </dd>
            </div>
          </dl>
          <div className="bar-actions">
            {blocked && !sending && (
              <span className="bar-warn">
                {step === 0
                  ? 'Pick at least one shop.'
                  : !creative
                    ? 'Upload your artwork to submit.'
                    : 'Add an email so we can reply.'}
              </span>
            )}
            <button
              type="button"
              className="button ghost"
              onClick={() => (step > 0 ? setStep(step - 1) : onCancel())}
            >
              <ArrowLeft size={16} /> {step > 0 ? 'Back' : 'Cancel'}
            </button>
            <button
              type="button"
              className="button invert"
              data-track={step === 2 ? 'campaign-submit' : 'campaign-next'}
              disabled={blocked}
              onClick={() => (step < 2 ? setStep(step + 1) : void save())}
            >
              {step === 2 ? (sending ? 'Sending…' : 'Send this to AdBite') : 'Continue'}{' '}
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
  return statusOf(campaign) === 'live' ? (
    <span className="status live">
      <Radio size={13} /> On screen
    </span>
  ) : (
    <span className="status review">
      <Hourglass size={13} /> In review with the shop
    </span>
  );
}

function CampaignDetail({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const totals = totalsOf(campaign);
  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <span className="detail-tags-row">
            <StatusTag campaign={campaign} />
            {campaign.sample && (
              <span className="status sample">
                <Sparkles size={12} /> Sample
              </span>
            )}
          </span>
          <h2>{campaign.name}</h2>
          <p>
            Booked {day.format(new Date(campaign.createdAt))}
            {campaign.startedAt ? ` · playing since ${day.format(new Date(campaign.startedAt))}` : ''}
            {campaign.note ? ` · ${campaign.note}` : ''}
          </p>
        </div>
        <button type="button" className="detail-delete" onClick={onDelete}>
          <Trash2 size={15} /> Delete
        </button>
      </div>

      {!totals.running && (
        <p className="detail-banner">
          Nothing has played yet, so every figure below is the week you booked rather than a week
          that ran. Reporting switches over the first time the board plays your spot.
        </p>
      )}

      <AnalyticsPanel
        booking={campaign}
        creativeName={campaign.creativeName}
        creativeSrc={campaign.creativeSrc}
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
  const { ready: listReady, campaigns } = useCampaigns();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const active = useMemo(
    () => campaigns.find((campaign) => campaign.id === selected) ?? campaigns[0],
    [campaigns, selected],
  );

  const weekly = campaigns.reduce((total, campaign) => total + campaign.weeklySpend, 0);
  const minutes = campaigns.reduce((total, campaign) => total + campaignMinutes(campaign), 0);
  const running = campaigns.filter((campaign) => statusOf(campaign) === 'live').length;
  const spent = campaigns.reduce((total, campaign) => total + totalsOf(campaign).spend, 0);

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
              <span className="pulse" /> Advertiser
            </span>
            <h1>Your campaigns</h1>
          </div>
          <dl className="dash-totals">
            <div>
              <dt>On screen</dt>
              <dd>{listReady ? `${running} / ${campaigns.length}` : '—'}</dd>
            </div>
            <div>
              <dt>Weekly spend</dt>
              <dd className="money">{listReady ? money.format(weekly) : '—'}</dd>
            </div>
            <div>
              <dt>Spent to date</dt>
              <dd className="money">{listReady ? money.format(spent) : '—'}</dd>
            </div>
            <div>
              <dt>Minutes / week</dt>
              <dd>{listReady ? count.format(minutes) : '—'}</dd>
            </div>
            <div>
              <dt>Screens reachable</dt>
              <dd>{totalScreens()}</dd>
            </div>
          </dl>
          <div className="dash-head-actions">
            <SideSwitch />
            <button type="button" className="button invert" onClick={() => setCreating(true)}>
              <Plus size={17} /> New campaign
            </button>
          </div>
        </div>
      </div>

      <section className="dash">
        <aside className="dash-list" aria-label="Your campaigns">
          <div className="dash-list-scroll">
            {campaigns.map((campaign) => {
              const stats = totalsOf(campaign);
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
                    {campaign.venues.length} shop{campaign.venues.length === 1 ? '' : 's'} ·{' '}
                    {count.format(campaignMinutes(campaign))} min / wk
                    {stats.running ? ` · ${money.format(stats.spend)} spent` : ''}
                  </span>
                  <span className="dash-item-tags">
                    <StatusTag campaign={campaign} />
                    {campaign.sample && <span className="status sample">Sample</span>}
                  </span>
                </button>
              );
            })}
            <button type="button" className="dash-add" onClick={() => setCreating(true)}>
              <Plus size={15} /> New campaign
            </button>
            {listReady && hasSamples(campaigns) && (
              <button type="button" className="dash-add quiet" onClick={clearSamples}>
                <Trash2 size={14} /> Remove the samples
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
                removeCampaign(active.id);
                setSelected(null);
              }}
            />
          ) : (
            <div className="dash-empty">
              <Bite className="bite" />
              <h2>No campaigns yet.</h2>
              <p>
                {LIVE_VENUES.length} board is playing ads today, and it holds{' '}
                {count.format(inventory(LIVE_VENUES).minutes)} minutes of ad time a week. Another{' '}
                {VENUES.length - LIVE_VENUES.length} shops across Provo and Orem are being
                installed and can be booked ahead.
              </p>
              <div className="dash-empty-actions">
                <button type="button" className="button primary" onClick={() => setCreating(true)}>
                  <Plus size={17} /> New campaign
                </button>
                <button type="button" className="button ghost" onClick={loadSamples}>
                  <Sparkles size={16} /> Load four worked examples
                </button>
              </div>
              <p className="dash-empty-note">
                Made-up bookings: three with a few weeks on the clock so the reporting has
                something to show, and one still waiting on the shop owner. They are badged Sample
                everywhere and clear in one click.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
