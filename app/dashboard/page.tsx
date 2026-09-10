'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Hourglass,
  Lock,
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
import { AGE_BANDS, DAYPARTS, VENUES, totalScreens } from '@/lib/network';
import {
  RATE_PER_MINUTE,
  addCampaign,
  minutesFor,
  removeCampaign,
  useCampaigns,
  type Campaign,
} from '@/lib/campaigns';
import { useSession } from '@/lib/auth';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const rate = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-US');
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const NAV = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
];

const STEPS = [
  { n: '01', title: 'Set your spend', note: 'Minutes on screen, by the week' },
  { n: '02', title: 'Choose where', note: 'Shop, time of day, audience' },
  { n: '03', title: 'Build your ad', note: 'Format, artwork, and previews' },
];

const FOOTER = [
  { href: '/advertisers', label: 'For advertisers' },
  { href: '/', label: 'For shops' },
  { href: '/faq', label: 'FAQ' },
  { href: 'mailto:hello@adbite.local', label: 'Contact' },
];

function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}

/* ---- the creation suite, opened by the New campaign button --------------- */

function NewCampaign({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [spend, setSpend] = useState(150);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [format, setFormat] = useState<FormatId>('banner');
  const [creative, setCreative] = useState<{ name: string; src: string } | null>(null);

  const chosen = chosenVenues(placement);
  const minutes = minutesFor(spend);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const blocked = (step === 1 && chosen.length === 0) || (step === 2 && !creative);

  const save = () => {
    addCampaign({
      name: `${formatName(format)} · ${day.format(new Date())}`,
      weeklySpend: spend,
      format,
      venues: placement.venues,
      ages: placement.ages,
      dayparts: placement.dayparts,
      creativeName: creative?.name ?? null,
      creativeSrc: creative?.src ?? null,
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
        {step === 0 && <SpendStep spend={spend} onChange={setSpend} />}
        {step === 1 && <PlaceStep placement={placement} onChange={setPlacement} />}
        {step === 2 && (
          <CreativeStep
            format={format}
            onFormat={setFormat}
            creative={creative}
            onCreative={setCreative}
          />
        )}
      </section>

      <div className="campaign-bar">
        <div className="wrap campaign-bar-inner">
          <dl className="bar-summary">
            <div>
              <dt>Minutes / week</dt>
              <dd>{count.format(minutes)}</dd>
            </div>
            <div>
              <dt>Spend</dt>
              <dd className="money">{money.format(spend)}</dd>
            </div>
            <div>
              <dt>Shops</dt>
              <dd>{chosen.length || '—'}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{formatName(format)}</dd>
            </div>
          </dl>
          <div className="bar-actions">
            {blocked && (
              <span className="bar-warn">
                {step === 1 ? 'Pick the shop to continue.' : 'Upload your artwork to submit.'}
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
              disabled={blocked}
              onClick={() => (step < 2 ? setStep(step + 1) : save())}
            >
              {step === 2 ? 'Submit for shop approval' : 'Continue'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <p className="campaign-rate wrap">
        Billed at {rate.format(RATE_PER_MINUTE)} per minute shown. Pilot pricing.
      </p>
    </>
  );
}

/* ---- the campaign the dashboard is showing ------------------------------ */

function CampaignDetail({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const minutes = minutesFor(campaign.weeklySpend);
  const venues = VENUES.filter((venue) => campaign.venues.includes(venue.id));
  const board = boardById(FORMATS.find((item) => item.id === campaign.format)?.showcase ?? 'rosas');
  const slot = board.slots[campaign.format];
  const dayparts = campaign.dayparts.length
    ? DAYPARTS.filter((part) => campaign.dayparts.includes(part.id)).map((part) => part.label)
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
          <small>Minutes booked / week</small>
          <b>{count.format(minutes)}</b>
        </article>
        <article>
          <small>Rate</small>
          <b>{rate.format(RATE_PER_MINUTE)}</b>
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
              <dt>Minutes shown</dt>
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
            <small>Time of day</small>
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
            The shop runs one rotation for the whole room, so these travel with the booking as a
            request rather than a split of the audience.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ---- the dashboard ------------------------------------------------------ */

export default function DashboardPage() {
  const { ready, session } = useSession();
  const { ready: listReady, campaigns } = useCampaigns();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const active = useMemo(
    () => campaigns.find((campaign) => campaign.id === selected) ?? campaigns[0],
    [campaigns, selected],
  );

  const weekly = campaigns.reduce((total, campaign) => total + campaign.weeklySpend, 0);
  const minutes = campaigns.reduce((total, campaign) => total + minutesFor(campaign.weeklySpend), 0);

  return (
    <main className="campaign-page">
      <SiteHeader nav={NAV} />

      {!ready ? (
        <div className="campaign-loading" aria-hidden="true" />
      ) : !session ? (
        <div className="campaign-gate">
          <Bite className="bite" />
          <Lock size={26} />
          <h1>Sign in to reach your dashboard.</h1>
          <p>The advertiser tools are open to pilot accounts while AdBite is in its first city.</p>
          <Link className="button primary" href="/signin?next=%2Fdashboard">
            Sign in <ArrowRight size={17} />
          </Link>
        </div>
      ) : creating ? (
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
                    {count.format(minutesFor(campaign.weeklySpend))} min / week ·{' '}
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
                    AdBite is live in one shop in Provo. Book a week on their board and this is
                    where the numbers will land.
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
