'use client';

import { BoardCanvas } from '@/components/board/board-canvas';
import { CreativeDrop } from '@/components/campaign/creative-step';
import { slotNow } from '@/lib/board-shape';
import { booked, type Line } from '@/lib/booking';
import { boardFor, useLiveBoards, type LiveBoard } from '@/lib/live-boards';
import { venuesByIds } from '@/lib/network';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';

/* The artwork, on the wall it is going on.
 *
 * Every preview in this product used to be a photograph of somebody else's
 * shop with a rectangle drawn on it. This is the shop that was actually
 * booked, drawing its own live board, with the advertiser's file in the space
 * they bought — so what they approve here is what goes up, and a picture that
 * is unreadable against that shop's dark enamel board is unreadable here
 * first.
 *
 * One file per shop rather than one for the campaign, because the spaces are
 * different shapes: a strip along the foot of a taqueria's board and a
 * full-screen turn in a gym are not the same picture, and pretending they are
 * is how an advertiser ends up with a logo three pixels tall.
 */

function AdInSlot({ line }: { line: Line }) {
  const t = useCopy(CAMPAIGN).creative;
  if (!line.creative) return <span className="board-ad-mine empty">{t.yourAdHere}</span>;
  return line.creative.kind === 'video' ? (
    <video className="board-ad-mine" src={line.creative.src} muted loop autoPlay playsInline />
  ) : (
    <img className="board-ad-mine" src={line.creative.src} alt={t.uploadedAlt} />
  );
}

function ArtworkRow({
  line,
  live,
  name,
  onChange,
}: {
  line: Line;
  live: LiveBoard | null;
  name: string;
  onChange: (line: Line) => void;
}) {
  const t = useCopy(CAMPAIGN).boards;
  const pay = useCopy(CAMPAIGN).pay;

  return (
    <section className="artwork-row">
      <div className="artwork-row-head">
        <b>{pay.perShop(name, line.deviceIds.length)}</b>
        <span>{line.space === 'video' ? t.spaces.video.label : t.spaces.banner.label}</span>
      </div>

      <div className="artwork-row-body">
        <div className="artwork-row-drop">
          <CreativeDrop
            creative={line.creative}
            onCreative={(creative) => onChange({ ...line, creative })}
          />
        </div>

        <figure className="artwork-row-live">
          <figcaption>{t.liveNow}</figcaption>
          {live?.board ? (
            <BoardCanvas board={live.board} slot={slotNow()} ad={<AdInSlot line={line} />} />
          ) : (
            <p className="board-row-none">{t.noBoard}</p>
          )}
        </figure>
      </div>
    </section>
  );
}

export function ArtworkStep({
  lines,
  onChange,
}: {
  lines: Line[];
  onChange: (lines: Line[]) => void;
}) {
  const t = useCopy(CAMPAIGN).creative;
  const pay = useCopy(CAMPAIGN).pay;
  const mine = booked(lines);
  const { boards } = useLiveBoards(mine.map((line) => line.venueId));
  const venues = venuesByIds(mine.map((line) => line.venueId));

  const put = (venueId: string, next: Line) =>
    onChange(lines.map((line) => (line.venueId === venueId ? next : line)));

  if (mine.length === 0) return <p className="prefs-note">{pay.nothing}</p>;

  return (
    <div className="artwork-step">
      <div className="prefs-head">
        <h3>{t.upload}</h3>
        <span className="prefs-hint">{pay.hint}</span>
      </div>

      {mine.map((line) => {
        const live = boardFor(boards, line.venueId);
        return (
          <ArtworkRow
            key={line.venueId}
            line={line}
            live={live}
            name={live?.shopName ?? venues.find((entry) => entry.id === line.venueId)?.name ?? line.venueId}
            onChange={(next) => put(line.venueId, next)}
          />
        );
      })}
    </div>
  );
}
