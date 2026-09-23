'use client';

import { Check, Monitor, Radio, WifiOff } from 'lucide-react';
import { BoardCanvas } from '@/components/board/board-canvas';
import { slotNow } from '@/lib/board-shape';
import { spacesFor, type Line, type Space } from '@/lib/booking';
import {
  boardFor,
  useLiveBoards,
  type LiveBoard,
  type LiveDevice,
} from '@/lib/live-boards';
import {
  SPOT_TERMS,
  VIDEO_HOURLY,
  money,
  spotPrice,
  videoCost,
  type SpotTerm,
} from '@/lib/pricing';
import { venuesByIds } from '@/lib/network';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';

/* Choosing a space on somebody's wall.
 *
 * The board drawn here is the shop's own, fetched live: the same JSON its
 * owner edits, drawn by the same component their editor draws it with. That
 * is the point of the step. An advertiser deciding between two taquerias was
 * choosing between two names on a map and a footfall figure somebody typed;
 * now they are choosing between two screens they can read.
 *
 * What is offered on each board is what that shop said it would carry, and
 * nothing else — a shop that put its ads in the strip is not also selling a
 * full-screen turn, because it is not running one. A board with advertising
 * switched off says so rather than being hidden, because the advertiser
 * picked that shop by name a step ago and wants to know what happened to it.
 *
 * The TVs are the unit. One spot is one banner on one screen, so a shop with a
 * board over the counter and another by the door sells two, and the price
 * follows the count rather than the shop.
 */

function Screen({
  device,
  index,
  on,
  space,
  onToggle,
}: {
  device: LiveDevice;
  index: number;
  on: boolean;
  space: Space;
  onToggle: () => void;
}) {
  const t = useCopy(CAMPAIGN).boards;
  /* A second screen carries no menu, so it has no strip to sell. It is still
     in the rotation, so it can carry video. */
  const full =
    space === 'banner' && (device.screen === 'reel' || device.spotsFree <= 0);

  return (
    <button
      type="button"
      className={`tv-pick${on ? ' on' : ''}${full ? ' full' : ''}`}
      aria-pressed={on}
      disabled={full}
      onClick={onToggle}
    >
      <span className="tv-pick-mark" aria-hidden="true">
        {on ? <Check size={13} /> : <Monitor size={13} />}
      </span>
      <span className="tv-pick-words">
        <b>{device.name || t.unnamedScreen(index + 1)}</b>
        <span>
          {device.online ? (
            <>
              <Radio size={11} /> {t.online}
            </>
          ) : (
            <>
              <WifiOff size={11} /> {t.offline}
            </>
          )}
          {space === 'banner' &&
            (device.screen === 'reel'
              ? ` · ${t.menuOnly}`
              : device.spotsFree > 0
                ? ` · ${t.spotsLeft(device.spotsFree)}`
                : ` · ${t.full}`)}
        </span>
      </span>
    </button>
  );
}

function BoardRow({
  line,
  live,
  name,
  kind,
  onChange,
}: {
  line: Line;
  live: LiveBoard | null;
  name: string;
  kind: string;
  onChange: (line: Line) => void;
}) {
  const t = useCopy(CAMPAIGN).boards;
  const spaces = spacesFor(live?.adPlacement);
  const devices = live?.devices ?? [];

  const pickSpace = (space: Space) => {
    if (line.space === space) {
      onChange({ ...line, space: null, deviceIds: [] });
      return;
    }
    /* Switching between a spot and a turn changes which screens are even
       eligible, so the choice of TVs starts again rather than silently
       keeping one that cannot carry it. */
    onChange({ ...line, space, deviceIds: [] });
  };

  const toggleDevice = (id: string) => {
    const on = line.deviceIds.includes(id);
    onChange({
      ...line,
      deviceIds: on
        ? line.deviceIds.filter((entry) => entry !== id)
        : [...line.deviceIds, id],
    });
  };

  /* What the strip is called on this board depends on where its owner put it.
     Same product, same price; the advertiser should still be told whether
     their picture is going along the foot or down the side. */
  const spaceCopy = (space: Space) =>
    space === 'video'
      ? t.spaces.video
      : live?.adPlacement === 'rail'
        ? t.spaces.rail
        : t.spaces.banner;

  const cost =
    line.space === 'banner'
      ? money.format(line.deviceIds.length * spotPrice(line.term))
      : line.space === 'video'
        ? money.format(videoCost(line.hours))
        : null;

  return (
    <section className={`board-row${line.space ? ' on' : ''}`}>
      <div className="board-row-head">
        <div>
          <b>{name}</b>
          <span>{kind}</span>
        </div>
        {cost && (
          <span className="board-row-cost">
            <i>{t.lineTotal}</i>
            <b className="money">{cost}</b>
          </span>
        )}
      </div>

      <div className="board-row-body">
        <figure className="board-row-live">
          <figcaption>{t.liveNow}</figcaption>
          {live?.board ? (
            <BoardCanvas board={live.board} slot={slotNow()} stage={live.stage} />
          ) : (
            <p className="board-row-none">{t.noBoard}</p>
          )}
        </figure>

        <div className="board-row-pick">
          {!live ? (
            <p className="board-row-none">{t.notLive}</p>
          ) : spaces.length === 0 ? (
            <p className="board-row-none">{t.noSpace}</p>
          ) : (
            <>
              <div className="space-options">
                {spaces.map((space) => {
                  const words = spaceCopy(space);
                  return (
                    <button
                      key={space}
                      type="button"
                      className={`space-option${line.space === space ? ' on' : ''}`}
                      aria-pressed={line.space === space}
                      onClick={() => pickSpace(space)}
                    >
                      <b>{words.label}</b>
                      <span>{words.note}</span>
                      <i>
                        {space === 'banner'
                          ? t.termNote(
                              money.format(spotPrice(line.term)),
                              line.term === 'year' ? 12 : 3,
                            )
                          : t.hoursNote(money.format(VIDEO_HOURLY))}
                      </i>
                    </button>
                  );
                })}
              </div>

              {!line.space && <p className="prefs-note">{t.pickSpace}</p>}

              {line.space === 'banner' && (
                <fieldset className="term-pick">
                  <legend>{t.term}</legend>
                  <div className="term-options">
                    {SPOT_TERMS.map((term) => (
                      <button
                        key={term.id}
                        type="button"
                        className={`term-option${line.term === term.id ? ' on' : ''}`}
                        aria-pressed={line.term === term.id}
                        onClick={() =>
                          onChange({ ...line, term: term.id as SpotTerm })
                        }
                      >
                        <b>{t.terms[term.id]}</b>
                        <span className="money">
                          {money.format(term.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {line.space === 'video' && (
                <label className="hours-pick">
                  <span>
                    {t.hours}
                    <b>{line.hours}</b>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={line.hours}
                    onChange={(event) =>
                      onChange({ ...line, hours: Number(event.target.value) })
                    }
                  />
                </label>
              )}

              {line.space && (
                <fieldset className="tv-pick-set">
                  <legend>{t.screens}</legend>
                  {devices.length === 0 ? (
                    <p className="prefs-note">{t.noScreens}</p>
                  ) : (
                    <>
                      <div className="tv-picks">
                        {devices.map((device, index) => (
                          <Screen
                            key={device.id}
                            device={device}
                            index={index}
                            space={line.space as Space}
                            on={line.deviceIds.includes(device.id)}
                            onToggle={() => toggleDevice(device.id)}
                          />
                        ))}
                      </div>
                      <p className="prefs-note">
                        {line.deviceIds.length === 0
                          ? t.chooseScreens
                          : t.screensNote}
                      </p>
                    </>
                  )}
                </fieldset>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function BoardStep({
  lines,
  onChange,
}: {
  lines: Line[];
  onChange: (lines: Line[]) => void;
}) {
  const t = useCopy(CAMPAIGN).boards;
  const { boards } = useLiveBoards(lines.map((line) => line.venueId));
  const venues = venuesByIds(lines.map((line) => line.venueId));

  const put = (venueId: string, next: Line) =>
    onChange(lines.map((line) => (line.venueId === venueId ? next : line)));

  return (
    <div className="boards-step">
      <div className="prefs-head">
        <h3>{t.title}</h3>
        <span className="prefs-hint">{t.hint}</span>
      </div>

      {/* Boards that can actually be bought come first. A shop on the map that
          has not hung a screen yet is still shown, because the advertiser
          picked it by name a step ago and is owed an answer about it, but it
          does not belong above the ones they can book today. */}
      {[...lines]
        .sort(
          (a, b) =>
            Number(Boolean(boardFor(boards, b.venueId))) -
            Number(Boolean(boardFor(boards, a.venueId))),
        )
        .map((line) => {
          const venue = venues.find((entry) => entry.id === line.venueId);
          const live = boardFor(boards, line.venueId);
          return (
            <BoardRow
              key={line.venueId}
              line={line}
              live={live}
              name={live?.shopName ?? venue?.name ?? line.venueId}
              kind={venue?.kind ?? ''}
              onChange={(next) =>
                put(line.venueId, {
                  ...next,
                  shopId: live?.shopId ?? next.shopId,
                })
              }
            />
          );
        })}
    </div>
  );
}
