'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Hourglass,
  Mail,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CreativeStep } from '@/components/campaign/creative-step';
import {
  DEFAULT_PLACEMENT,
  PlaceStep,
  chosenVenues,
  type Placement,
} from '@/components/campaign/place-step';
import { SpendStep } from '@/components/campaign/spend-step';
import { VenueMap } from '@/components/venue-map';
import { FORMATS, boardById, type FormatId } from '@/lib/boards';
import { AGE_BANDS, VENUES, totalScreens } from '@/lib/network';
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
  campaignRate,
  removeCampaign,
  useCampaigns,
  type Campaign,
} from '@/lib/campaigns';
import { submitLead } from '@/lib/leads';

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const NAV = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
];

const STEPS = [
  { n: '01', title: 'Price it', note: 'Shape, timing and spend' },
  { n: '02', title: 'Place it', note: 'Shop and audience' },
  { n: '03', title: 'Make it', note: 'Artwork and previews' },
];

const FOOTER = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
  { href: 'mailto:info@adbite.site', label: 'Contact' },
];

function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}

/* ---- the creation suite, opened by the New campaign button --------------- */

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const blocked =
    (step === 1 && chosen.length === 0) || (step === 2 && (!creative || !emailOk || sending));

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
    });
    onDone();
  };

  return (
    <>
      <div className="campaign-head">
        <div className="wrap">
          <button type="button" className="head-back" onClick={onCancel}>
            <ArrowLeft size={15} /> Dashboard
          </button>
          <h1>New campaign</h1>
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

      <section className="campaign-body wrap">
        {step === 0 && (
          <SpendStep
            spend={spend}
            onChange={setSpend}
            dayparts={dayparts}
            onDayparts={setDayparts}
            format={format}
            onFormat={setFormat}
          />
        )}
        {step === 1 && <PlaceStep placement={placement} onChange={setPlacement} />}
        {step === 2 && (
          <>
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
                AdBite is in pilot and we are not quite ready for volume, so this goes to
                info@adbite.site as a request rather than booking the week outright. Nothing is
                charged now, the shop owner reviews your creative before anything runs, and you
                only ever pay for what actually plays.
              </p>
              {error && (
                <p className="prefs-warn" role="alert">
                  {error}
                </p>
              )}
            </section>
          </>
        )}
      </section>

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
              <dd>{formatName(format)}</dd>
            </div>
          </dl>
          <div className="bar-actions">
            {blocked && !sending && (
              <span className="bar-warn">
                {step === 1
                  ? 'Pick the shop to continue.'
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
      <p className="campaign-rate wrap">
        {formatName(format)}, billed by the {byPlay ? 'play' : 'minute'}:{' '}
        {rate.format(rateFor(format, 'lunch'))} peak, {rate.format(rateFor(format, 'afternoon'))}{' '}
        off-peak. You pay for {byPlay ? 'plays that ran' : 'minutes shown'}, nothing else.
      </p>
    </>
  );
}

/* ---- the campaign the dashboard is showing ------------------------------ */

function CampaignDetail({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const minutes = campaignMinutes(campaign);
  const venues = VENUES.filter((venue) => campaign.venues.includes(venue.id));
  const board = boardById(FORMATS.find((item) => item.id === campaign.format)?.showcase ?? 'rosas');
  const slot = board.slots[campaign.format];
  const dayparts = campaign.dayparts.length
    ? DAYPARTS.filter((part) => campaign.dayparts.includes(part.id)).map(
        (part) => `${part.label} · ${part.tier === 'peak' ? 'peak' : 'off-peak'}`,
      )
    : ['All opening hours'];
  const ages = campaign.ages.length
    ? AGE_BANDS.filter((band) => campaign.ages.includes(band.id)).map((band) => band.label)
    : ['No age preference'];

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <span className="status review">
            <Hourglass size={13} /> In review with the shop
          </span>
          <h2>{campaign.name}</h2>
          <p>Booked {day.format(new Date(campaign.createdAt))}</p>
        </div>
        <button type="button" className="detail-delete" onClick={onDelete}>
          <Trash2 size={15} /> Delete
        </button>
      </div>

      <div className="stat-grid">
        <article>
          <small>Weekly spend</small>
          <b>{money.format(campaign.weeklySpend)}</b>
        </article>
        <article>
          <small>{unitOf(campaign.format) === 'play' ? 'Plays' : 'Minutes'} booked / week</small>
          <b>{count.format(unitOf(campaign.format) === 'play' ? minutes * 4 : minutes)}</b>
        </article>
        <article>
          <small>Rate · {unitOf(campaign.format) === 'play' ? 'per play' : 'per minute'}</small>
          <b className="money">
            {rate.format(
              unitOf(campaign.format) === 'play'
                ? campaignRate(campaign) / 4
                : campaignRate(campaign),
            )}
          </b>
        </article>
        <article>
          <small>Screens</small>
          <b>{totalScreens(venues)}</b>
        </article>
      </div>

      <div className="detail-split">
        <section className="detail-card">
          <h3>Delivery</h3>
          <dl className="delivery">
            <div>
              <dt>{unitOf(campaign.format) === 'play' ? 'Plays run' : 'Minutes shown'}</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Spend to date</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>First play</dt>
              <dd>—</dd>
            </div>
          </dl>
          <p className="detail-note">
            Reporting starts the first time the board plays your spot. Until the shop approves it,
            there is nothing to report and nothing to pay.
          </p>
        </section>

        <section className="detail-card">
          <h3>Creative</h3>
          <div className="detail-board">
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
                  {campaign.creativeSrc ? (
                    <img src={campaign.creativeSrc} alt="" />
                  ) : (
                    <span>{campaign.creativeName ?? 'Artwork'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="detail-note">
            {formatName(campaign.format)} · {campaign.creativeName ?? 'artwork on file'}. Shown on
            an example board to illustrate the slot. Bao Pao Wow’s own board is not pictured.
          </p>
        </section>
      </div>

      <div className="detail-split">
        <section className="detail-card">
          <h3>Where it runs</h3>
          {venues.map((venue) => (
            <div className="detail-venue" key={venue.id}>
              <b>{venue.name}</b>
              <span>
                <MapPin size={13} /> {venue.street}, {venue.city}
              </span>
              <span>
                <Clock size={13} /> {venue.hours}
              </span>
            </div>
          ))}
          <div className="detail-map">
            <VenueMap venues={venues} zoom={15} interactive={false} />
          </div>
        </section>

        <section className="detail-card">
          <h3>Requested</h3>
          <div className="detail-tags">
            <small>When it runs</small>
            <div>
              {dayparts.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
          <div className="detail-tags">
            <small>Audience</small>
            <div>
              {ages.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
          <p className="detail-note">
            When it runs sets the rate. Who it reaches travels with the booking as a request: the
            shop runs one rotation for the whole room, so we will not pretend to split it finer
            than that.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ---- the dashboard ------------------------------------------------------ */

/* The builder used to sit behind a sign-in whose only credential was hardcoded
   and never shown to anyone, so every advertiser CTA on the site ended at a
   door that could not open. Nothing in here needs a server or a session: the
   campaigns live in this browser. It is open, and the email is asked for at
   submit, which is also the moment intent is highest. */
export function DashboardPage() {
  const { ready: listReady, campaigns } = useCampaigns();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const active = useMemo(
    () => campaigns.find((campaign) => campaign.id === selected) ?? campaigns[0],
    [campaigns, selected],
  );

  const weekly = campaigns.reduce((total, campaign) => total + campaign.weeklySpend, 0);
  const minutes = campaigns.reduce((total, campaign) => total + campaignMinutes(campaign), 0);

  return (
    <main className="campaign-page">
      <SiteHeader nav={NAV} />

      {creating ? (
        <NewCampaign onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      ) : (
        <>
          <div className="dash-head">
            <div className="wrap dash-head-inner">
              <div>
                <span className="eyebrow">
                  <span className="pulse" /> Advertiser dashboard
                </span>
                <h1>Your campaigns</h1>
              </div>
              <button type="button" className="button invert" onClick={() => setCreating(true)}>
                <Plus size={17} /> New campaign
              </button>
            </div>
            <div className="wrap dash-totals">
              <div>
                <small>Campaigns</small>
                <b>{listReady ? campaigns.length : '—'}</b>
              </div>
              <div>
                <small>Weekly spend</small>
                <b className="money">{listReady ? money.format(weekly) : '—'}</b>
              </div>
              <div>
                <small>Minutes booked / week</small>
                <b>{listReady ? count.format(minutes) : '—'}</b>
              </div>
              <div>
                <small>Screens in the network</small>
                <b>{totalScreens()}</b>
              </div>
            </div>
          </div>

          <section className="dash wrap">
            <aside className="dash-list" aria-label="Your campaigns">
              {listReady && campaigns.length === 0 && (
                <p className="dash-list-empty">Nothing booked yet.</p>
              )}
              {campaigns.map((campaign) => (
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
                    {count.format(campaignMinutes(campaign))} min / week ·{' '}
                    {campaign.venues.length} shop
                  </span>
                  <span className="status review">
                    <Hourglass size={12} /> In review
                  </span>
                </button>
              ))}
              <button type="button" className="dash-add" onClick={() => setCreating(true)}>
                <Plus size={15} /> New campaign
              </button>
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
                    AdBite is live in one shop in Provo, and its board holds{' '}
                    {count.format(inventory(VENUES).minutes)} minutes of ad time a week. Book some
                    of it and this is where the numbers will land.
                  </p>
                  <div className="dash-empty-venue">
                    {VENUES.map((venue) => (
                      <div key={venue.id}>
                        <b>{venue.name}</b>
                        <span>{venue.kind}</span>
                        <span>
                          {venue.street}, {venue.city}
                        </span>
                      </div>
                    ))}
                    <div className="dash-empty-map">
                      <VenueMap venues={VENUES} zoom={14} interactive={false} />
                    </div>
                  </div>
                  <button type="button" className="button primary" onClick={() => setCreating(true)}>
                    <Plus size={17} /> New campaign
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <SiteFooter links={FOOTER} />
    </main>
  );
}
