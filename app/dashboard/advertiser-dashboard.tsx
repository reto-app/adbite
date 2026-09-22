'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Hourglass,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react';
import { Bite } from '@/components/brand';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  DEFAULT_PLACEMENT,
  PlaceStep,
  chosenVenues,
  type Placement,
} from '@/components/campaign/place-step';
import { BoardStep } from '@/components/campaign/board-step';
import { ArtworkStep } from '@/components/campaign/artwork-step';
import { PayDone, PayStep } from '@/components/campaign/pay-step';
import { booked, costOf, emptyLine, missingArtwork, totalOf, type Line } from '@/lib/booking';
import { AnalyticsPanel } from '@/components/campaign/analytics-panel';
import { FORMATS, type FormatId } from '@/lib/boards';
import { LIVE_VENUES, VENUES, totalScreens, venueById } from '@/lib/network';
import {
  DAYPARTS,
  SPOT_QUARTERLY,
  SPOT_YEARLY,
  VIDEO_HOURLY,
  count,
  inventory,
  money,
} from '@/lib/pricing';
import {
  addCampaign,
  campaignMinutes,
  removeCampaign,
  statusOf,
  useCampaigns,
  type Campaign,
} from '@/lib/campaigns';
import { totalsOf } from '@/lib/delivery';
import { usePlays } from '@/lib/plays';
import { useAdvertiserStatements } from '@/lib/statements';
import { localeOf, useCopy, useLang } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';

function useDay() {
  const { lang } = useLang();
  return useMemo(
    () => new Intl.DateTimeFormat(localeOf(lang), { month: 'short', day: 'numeric' }),
    [lang],
  );
}

/* Place comes first. It used to be second, which meant the spend slider was
   priced against a network you had not chosen yet and its ceiling jumped
   under you the moment you did. The step names are in lib/copy/campaign.ts. */
const STEP_NUMBERS = ['01', '02', '03', '04'];

/* The name a campaign is filed under is data, not display, and stays English
   so the shop's queue and the mail read the same row. */
function formatName(id: FormatId) {
  return FORMATS.find((item) => item.id === id)?.name ?? id;
}

/* ---- the creation suite, opened by the New campaign button ---------------
   Four steps, and the order is the order somebody actually decides in:

     01  which shops
     02  which space on each of their boards, and which of their TVs
     03  the artwork for each, seen on that shop's own live board
     04  everything at once, and what it costs

   It used to be three, and the middle one asked what format you wanted
   before you had seen a single board -- so an advertiser chose "a permanent
   spot" against a footfall number and found out afterwards whether the shop
   even had a strip to put one in. Now the board comes first and the format
   falls out of the space: a shop running a bottom strip sells a still, a shop
   running a full-screen turn sells fifteen seconds, and a shop carrying no
   advertising this week says so on its own card.

   The basket is a line per shop (lib/booking.ts), so two shops can be bought
   two different ways in one pass. Each line becomes its own campaign row,
   because each is approved by a different shop owner and invoiced separately.

   The whole builder is one screen tall: head, stepper, a body that scrolls
   inside itself, and a bar pinned to the bottom. */

function NewCampaign({
  onDone,
  onCancel,
}: {
  /* The id of the first booking made, so closing the builder lands on that
     campaign's reporting rather than on whatever was top of the list. */
  onDone: (campaignId?: string) => void;
  onCancel: () => void;
}) {
  const t = useCopy(CAMPAIGN).dash;
  const pay = useCopy(CAMPAIGN).pay;
  const day = useDay();
  const [step, setStep] = useState(0);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  /* Seeded from the same default the first step opens on, so stepping
     straight through lands on the boards that are already selected rather
     than on an empty step. */
  const [lines, setLines] = useState<Line[]>(() =>
    DEFAULT_PLACEMENT.venues.map((venueId) => emptyLine(venueId, null)),
  );
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState('');

  const chosen = chosenVenues(placement);

  /* The basket follows the shops. A shop taken out of step 01 takes its line
     with it; a shop put back in gets a fresh one rather than whatever it was
     set to three minutes ago, because the board it is being judged against
     has been refetched since. */
  const syncLines = (next: Placement) => {
    setPlacement(next);
    setLines((current) =>
      next.venues.map((venueId) => current.find((line) => line.venueId === venueId) ?? emptyLine(venueId, null)),
    );
  };

  const mine = booked(lines);
  const totals = totalOf(mine);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const blocked =
    (step === 0 && chosen.length === 0) ||
    (step === 1 && mine.length === 0) ||
    (step === 2 && missingArtwork(lines).length > 0) ||
    (step === 3 && (mine.length === 0 || !emailOk || sending));

  /* One row per shop, because one shop owner approves each one and one
     invoice is raised against each one. They are written in sequence rather
     than in parallel: a half-written basket is easier to reason about than a
     half-written basket with the failures in a different order than the
     lines. */
  const save = async () => {
    setSending(true);
    setError('');
    let first: string | undefined;
    try {
      for (const line of mine) {
        const cost = costOf(line);
        const format: FormatId = line.space === 'video' ? 'video' : 'banner';
        const saved = await addCampaign({
          /* Named for the shop it is on, not for the day it was booked: a
             basket of four lands as four rows in one list and they were all
             called the same thing. */
          name: `${formatName(format)} · ${venueById(line.venueId)?.name ?? line.venueId}`,
          weeklySpend: cost.weekly,
          spots: line.space === 'banner' ? line.deviceIds.length : 0,
          format,
          venues: [line.venueId],
          ages: placement.ages,
          dayparts: DAYPARTS.map((part) => part.id),
          deviceIds: line.deviceIds,
          term: line.space === 'banner' ? line.term : null,
          amountCents: Math.round((cost.once || cost.weekly) * 100),
          creativeName: line.creative?.name ?? null,
          creativeSrc: line.creative?.src ?? null,
          creativeId: line.creative?.creativeId ?? null,
          email: email.trim(),
          startedAt: null,
        });
        first ??= saved.id;
      }
      /* Nothing is collected in the browser. The bookings exist, the shops
         have them in their queues, and an invoice follows by mail. */
      setDone(first ?? '');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t.send.couldNotSave);
    } finally {
      setSending(false);
    }
  };

  if (done !== null) {
    return (
      <div className="builder">
        <div className="campaign-head">
          <div className="wrap campaign-head-inner">
            <div className="campaign-head-row">
              <h1>{t.newCampaign}</h1>
            </div>
          </div>
        </div>
        <div className="campaign-body">
          <div className="wrap campaign-body-inner">
            <PayDone onGo={() => onDone(done || undefined)} />
          </div>
        </div>
      </div>
    );
  }

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
          {step === 0 && <PlaceStep placement={placement} onChange={syncLines} />}
          {step === 1 && <BoardStep lines={lines} onChange={setLines} />}
          {step === 2 && <ArtworkStep lines={lines} onChange={setLines} />}
          {step === 3 && (
            <PayStep
              lines={lines}
              email={email}
              onEmail={(next) => {
                setEmail(next);
                setError('');
              }}
              error={error}
            />
          )}
        </div>
      </div>

      <div className="campaign-bar">
        <div className="wrap campaign-bar-inner">
          <dl className="bar-summary">
            <div>
              <dt>{t.bar.shops}</dt>
              <dd>{mine.length || chosen.length || '0'}</dd>
            </div>
            <div>
              <dt>{t.bar.screens}</dt>
              <dd>{mine.reduce((sum, line) => sum + line.deviceIds.length, 0)}</dd>
            </div>
            {totals.once > 0 && (
              <div>
                <dt>{pay.once}</dt>
                <dd className="money">{money.format(totals.once)}</dd>
              </div>
            )}
            {totals.weekly > 0 && (
              <div>
                <dt>{t.bar.spend}</dt>
                <dd className="money">{money.format(totals.weekly)}</dd>
              </div>
            )}
            <div className="bar-rate">
              <dt>{t.bar.rate}</dt>
              <dd>{t.bar.rateCard(money.format(SPOT_QUARTERLY), money.format(SPOT_YEARLY), money.format(VIDEO_HOURLY))}</dd>
            </div>
          </dl>
          <div className="bar-actions">
            {blocked && !sending && (
              <span className="bar-warn">
                {step === 0
                  ? t.bar.pickOne
                  : step === 1
                    ? t.bar.pickSpace
                    : step === 2
                      ? t.bar.upload
                      : t.bar.addEmail}
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
              data-track={step === 3 ? 'campaign-submit' : 'campaign-next'}
              disabled={blocked}
              onClick={() => (step < 3 ? setStep(step + 1) : void save())}
            >
              {step === 3 ? (sending ? pay.submitting : pay.submit) : t.bar.next}{' '}
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
        <DashboardHeader />
        <NewCampaign
          onDone={(campaignId) => {
            if (campaignId) setSelected(campaignId);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      </main>
    );
  }

  return (
    <main className="campaign-page">
      <DashboardHeader />

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
                  </span>
                </button>
              );
            })}
            <button type="button" className="dash-add" onClick={() => setCreating(true)}>
              <Plus size={15} /> {t.newCampaign}
            </button>
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
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
