'use client';

import { AlertCircle, Mail, Monitor } from 'lucide-react';
import { booked, costOf, totalOf, type Line } from '@/lib/booking';
import { boardFor, useLiveBoards } from '@/lib/live-boards';
import { venuesByIds } from '@/lib/network';
import { money, termById } from '@/lib/pricing';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';

/* The basket, and the one honest sentence about money.
 *
 * Two totals, never added together: a permanent spot is invoiced once for its
 * term and video is invoiced weekly on the hours that actually ran, and a
 * single "total" across the two would be wrong in whichever unit it was
 * printed in. An advertiser who has bought both should see both.
 *
 * Submitting books the spots and raises an invoice by mail. No card is taken
 * here, which the note says plainly rather than leaving somebody to find out
 * when nothing is charged: a booking that quietly does not collect is worse
 * than one that says it will not.
 */

export function PayStep({
  lines,
  email,
  onEmail,
  error,
}: {
  lines: Line[];
  email: string;
  onEmail: (email: string) => void;
  error: string;
}) {
  const t = useCopy(CAMPAIGN).pay;
  const b = useCopy(CAMPAIGN).boards;
  const mine = booked(lines);
  const { boards } = useLiveBoards(mine.map((line) => line.venueId));
  const venues = venuesByIds(mine.map((line) => line.venueId));
  const total = totalOf(mine);

  if (mine.length === 0) return <p className="prefs-note">{t.nothing}</p>;

  return (
    <div className="pay-step">
      <div className="prefs-head">
        <h3>{t.title}</h3>
        <span className="prefs-hint">{t.hint}</span>
      </div>

      <ul className="pay-lines">
        {mine.map((line) => {
          const live = boardFor(boards, line.venueId);
          const name = live?.shopName ?? venues.find((v) => v.id === line.venueId)?.name ?? line.venueId;
          const cost = costOf(line);
          const screens = line.deviceIds
            .map((id) => live?.devices.find((device) => device.id === id))
            .filter(Boolean);

          return (
            <li key={line.venueId}>
              <div className="pay-line-art">
                {line.creative ? (
                  line.creative.kind === 'video' ? (
                    <video src={line.creative.src} muted loop autoPlay playsInline />
                  ) : (
                    <img src={line.creative.src} alt="" />
                  )
                ) : (
                  <span className="pay-line-missing">
                    <AlertCircle size={15} />
                  </span>
                )}
              </div>

              <div className="pay-line-words">
                <b>{t.perShop(name, line.deviceIds.length)}</b>
                <span>
                  {line.space === 'video'
                    ? b.spaces.video.label
                    : live?.adPlacement === 'rail'
                      ? b.spaces.rail.label
                      : b.spaces.banner.label}
                  {line.space === 'banner' ? ` · ${b.terms[line.term]}` : ` · ${line.hours} ${b.hours}`}
                </span>
                <small>
                  {screens.map((device, index) => (
                    <span key={device?.id ?? index} className="pay-line-tv">
                      <Monitor size={11} /> {device?.name || b.unnamedScreen(index + 1)}
                    </span>
                  ))}
                </small>
                {!line.creative && <em className="pay-line-warn">{t.noArtwork}</em>}
              </div>

              <div className="pay-line-cost">
                <b className="money">{money.format(cost.once || cost.weekly)}</b>
                <i>
                  {cost.once
                    ? `${t.once} · ${termById(line.term).months} mo`
                    : t.weekly}
                </i>
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="pay-totals">
        {total.once > 0 && (
          <div>
            <dt>{t.total}</dt>
            <dd className="money">{money.format(total.once)}</dd>
          </div>
        )}
        {total.weekly > 0 && (
          <div>
            <dt>{t.weeklyTotal}</dt>
            <dd className="money">{money.format(total.weekly)}</dd>
          </div>
        )}
      </dl>

      <label className="send-field" htmlFor="pay-email">
        {t.email}
        <span className="field">
          <Mail size={16} />
          <input
            id="pay-email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(event) => onEmail(event.target.value)}
          />
        </span>
      </label>

      <p className="send-note">{t.terms}</p>

      {error && (
        <p className="prefs-warn" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* What the person sees the moment it is theirs. Deliberately one sentence and
   one link: the next useful thing is the reporting, and everything else can
   wait for the mail. */
export function PayDone({ onGo }: { onGo: () => void }) {
  const t = useCopy(CAMPAIGN).pay.done;
  return (
    <div className="pay-done">
      <h3>{t.title}</h3>
      <p>{t.text}</p>
      <p className="prefs-note">{t.invoice}</p>
      <button type="button" className="button invert" onClick={onGo}>
        {t.go}
      </button>
    </div>
  );
}
