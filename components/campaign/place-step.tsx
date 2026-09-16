'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  CircleDashed,
  Hand,
  Lasso,
  MapPin,
  Monitor,
  Search,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import {
  AGE_BANDS,
  GROUPS,
  NEIGHBORHOODS,
  VENUES,
  totalFootfall,
  type AgeBand,
  type AreaId,
  type GroupId,
  type Venue,
} from '@/lib/network';
import { count, inventory } from '@/lib/pricing';
import { SelectionMap, type DrawnShape, type Focus, type MapTool } from '@/components/selection-map';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';

export type Placement = {
  venues: string[];
  ages: AgeBand[];
};

/* A new campaign opens on the board that is actually running, which is the one
   selection that is true on day one. Everything else is a shop we are talking
   to, and adding one puts it on the request rather than on a bill. */
export const DEFAULT_PLACEMENT: Placement = {
  venues: VENUES.filter((venue) => venue.status === 'live').map((venue) => venue.id),
  ages: [],
};

export function chosenVenues(placement: Placement): Venue[] {
  return VENUES.filter((venue) => placement.venues.includes(venue.id));
}

/** A prospect's `since` is 'In conversation' or 'Waitlist' in the data; say
    it in the page's language and pass a real date through untouched. */
function sinceLabel(since: string, status: { inConversation: string; waitlist: string }) {
  if (since === 'In conversation') return status.inConversation;
  if (since === 'Waitlist') return status.waitlist;
  return since;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/* The words for each tool are in lib/copy/campaign.ts under `place.tools`. */
const TOOLS: { id: MapTool; icon: typeof Hand }[] = [
  { id: 'pan', icon: Hand },
  { id: 'radius', icon: CircleDashed },
  { id: 'lasso', icon: Lasso },
];

export function PlaceStep({
  placement,
  onChange,
}: {
  placement: Placement;
  onChange: (placement: Placement) => void;
}) {
  const t = useCopy(CAMPAIGN).place;
  const shared = useCopy(SHARED);
  const [query, setQuery] = useState('');
  const [areas, setAreas] = useState<AreaId[]>([]);
  const [groups, setGroups] = useState<GroupId[]>([]);
  const [tool, setTool] = useState<MapTool>('pan');
  const [focus, setFocus] = useState<Focus>(null);
  const [drawn, setDrawn] = useState<{ shape: string; added: number } | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  /* State, not a ref: the Undo button is rendered from it, and a ref read
     during render would not re-render the bar when a shape lands. */
  const [previous, setPrevious] = useState<string[] | null>(null);

  const set = (patch: Partial<Placement>) => onChange({ ...placement, ...patch });
  const selected = placement.venues;

  /** "1.2 km radius" or "hand-drawn area, 5 points", in the page's language. */
  const describe = (shape: DrawnShape) =>
    shape.kind === 'radius'
      ? t.radiusShape(shape.metres < 1000 ? `${Math.round(shape.metres)} m` : `${(shape.metres / 1000).toFixed(1)} km`)
      : t.areaShape(shape.points);

  /* The list narrows; the map does not. Filtering the pins away would hide the
     thing you are about to draw a circle around. */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return VENUES.filter((venue) => {
      if (areas.length && !areas.includes(venue.area)) return false;
      if (groups.length && !groups.includes(venue.group)) return false;
      if (!needle) return true;
      return `${venue.name} ${venue.kind} ${venue.street} ${venue.city}`
        .toLowerCase()
        .includes(needle);
    });
  }, [query, areas, groups]);

  const chosen = chosenVenues(placement);
  const live = chosen.filter((venue) => venue.status === 'live');
  const stock = inventory(chosen);

  const replace = (ids: string[]) => {
    setPrevious(selected);
    set({ venues: ids });
  };

  const addMany = (ids: string[]) => {
    setPrevious(selected);
    set({ venues: Array.from(new Set([...selected, ...ids])) });
  };

  const allOn = (ids: string[]) => ids.length > 0 && ids.every((id) => selected.includes(id));

  /* A grouping chip is a two-way switch: press it once to take the whole set,
     press it again to hand the whole set back. */
  const toggleSet = (ids: string[]) => {
    setPrevious(selected);
    set({
      venues: allOn(ids)
        ? selected.filter((id) => !ids.includes(id))
        : Array.from(new Set([...selected, ...ids])),
    });
  };

  return (
    <div className="place-step">
      <div className="pick-panel">
        <div className="pick-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            placeholder={t.search}
            aria-label={t.searchLabel}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" aria-label={t.clearSearch} onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pick-sets">
          <div className="pick-set">
            <span className="pick-set-label">{t.neighbourhoods}</span>
            <div className="chip-row">
              {NEIGHBORHOODS.map((area) => {
                const ids = VENUES.filter((venue) => venue.area === area.id).map(
                  (venue) => venue.id,
                );
                const filtered = areas.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    className={`chip${allOn(ids) ? ' on' : ''}${filtered ? ' filtered' : ''}`}
                    aria-pressed={allOn(ids)}
                    title={t.chipTitle(shared.areas[area.id].blurb, ids.length)}
                    onClick={(event) => {
                      if (event.shiftKey) {
                        setAreas(toggle(areas, area.id));
                        return;
                      }
                      toggleSet(ids);
                      setFocus({ at: area.at, zoom: area.zoom, key: Date.now() });
                      setDrawn({ shape: shared.areas[area.id].label, added: ids.length });
                    }}
                  >
                    {shared.areas[area.id].label} <i>{ids.length}</i>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pick-set">
            <span className="pick-set-label">{t.kinds}</span>
            <div className="chip-row">
              {GROUPS.map((group) => {
                const ids = VENUES.filter((venue) => venue.group === group.id).map(
                  (venue) => venue.id,
                );
                const filtered = groups.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`chip${allOn(ids) ? ' on' : ''}${filtered ? ' filtered' : ''}`}
                    aria-pressed={allOn(ids)}
                    title={t.chipTitle(shared.groups[group.id].blurb, ids.length)}
                    onClick={(event) => {
                      if (event.shiftKey) {
                        setGroups(toggle(groups, group.id));
                        return;
                      }
                      toggleSet(ids);
                      setDrawn({ shape: shared.groups[group.id].label, added: ids.length });
                    }}
                  >
                    {shared.groups[group.id].label} <i>{ids.length}</i>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pick-bulk">
          <span>{t.shown(visible.length, VENUES.length)}</span>
          <div>
            <button type="button" onClick={() => addMany(visible.map((venue) => venue.id))}>
              {t.selectShown}
            </button>
            <button type="button" onClick={() => replace([])}>
              {t.clear}
            </button>
            {(areas.length > 0 || groups.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setAreas([]);
                  setGroups([]);
                }}
              >
                {t.resetFilters}
              </button>
            )}
          </div>
        </div>

        <ul className="pick-list">
          {visible.map((venue) => {
            const on = selected.includes(venue.id);
            return (
              <li key={venue.id}>
                <button
                  type="button"
                  className={`pick-row${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => set({ venues: toggle(selected, venue.id) })}
                  onMouseEnter={() => setHot(venue.id)}
                  onMouseLeave={() => setHot(null)}
                  onFocus={() => setHot(venue.id)}
                  onBlur={() => setHot(null)}
                >
                  <span className="pick-tick">{on && <Check size={13} />}</span>
                  <span className="pick-body">
                    <b>
                      {venue.name}
                      {venue.status === 'live' ? (
                        <em className="tag live">{shared.status.live}</em>
                      ) : (
                        <em className="tag soon">{sinceLabel(venue.since, shared.status)}</em>
                      )}
                    </b>
                    <span className="pick-kind">
                      {venue.kind} · {shared.areas[venue.area].label}
                    </span>
                  </span>
                  <span className="pick-stats">
                    <i>
                      <Monitor size={12} /> {venue.screens}
                    </i>
                    <i>
                      <Users size={12} /> {count.format(venue.footfall)}
                    </i>
                  </span>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="pick-empty">{t.nothingMatches}</li>}
        </ul>

        <fieldset className="pick-ages">
          <legend>{t.whoTitle}</legend>
          <div className="chip-row">
            {AGE_BANDS.map((band) => (
              <button
                key={band.id}
                type="button"
                className={`chip${placement.ages.includes(band.id) ? ' on' : ''}`}
                aria-pressed={placement.ages.includes(band.id)}
                onClick={() => set({ ages: toggle(placement.ages, band.id) })}
              >
                {band.label}
              </button>
            ))}
          </div>
          <p>{t.whoNote}</p>
        </fieldset>
      </div>

      <div className="pick-map">
        <fieldset className="map-tools">
          <legend className="visually-hidden">{t.mapTools}</legend>
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? 'on' : undefined}
              aria-pressed={tool === item.id}
              onClick={() => setTool(item.id)}
            >
              <item.icon size={14} /> {t.tools[item.id].label}
            </button>
          ))}
          <span className="map-tool-hint">{t.tools[tool].hint}</span>
          {previous && (
            <button
              type="button"
              className="map-undo"
              onClick={() => {
                setPrevious(null);
                setDrawn(null);
                set({ venues: previous });
              }}
            >
              <Undo2 size={14} /> {t.undo}
            </button>
          )}
        </fieldset>

        <div className="map-frame">
          <SelectionMap
            venues={VENUES}
            selected={selected}
            tool={tool}
            focus={focus}
            highlight={hot}
            onToggle={(id) => set({ venues: toggle(selected, id) })}
            onRegion={(ids, shape) => {
              addMany(ids);
              setDrawn({ shape: describe(shape), added: ids.length });
            }}
            onToolDone={() => setTool('pan')}
          />
          {drawn && (
            <output className="map-drawn">
              <MapPin size={13} /> {t.drawn(drawn.shape, drawn.added)}
            </output>
          )}
        </div>

        <div className="map-foot">
          <div>
            <small>{t.foot.shops}</small>
            <b>
              {chosen.length}
              <i>{t.foot.of(VENUES.length)}</i>
            </b>
          </div>
          <div>
            <small>{t.foot.screens}</small>
            <b>{chosen.reduce((total, venue) => total + venue.screens, 0)}</b>
          </div>
          <div>
            <small>{t.foot.minutes}</small>
            <b>{count.format(stock.minutes)}</b>
          </div>
          <div>
            <small>{t.foot.heads}</small>
            <b>{count.format(totalFootfall(chosen))}</b>
          </div>
        </div>

        <p className="map-note">{t.note(live.length, chosen.length || 0)}</p>
      </div>
    </div>
  );
}
