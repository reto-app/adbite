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
  areaLabel,
  totalFootfall,
  type AgeBand,
  type AreaId,
  type GroupId,
  type Venue,
} from '@/lib/network';
import { count, inventory } from '@/lib/pricing';
import { SelectionMap, type Focus, type MapTool } from '@/components/selection-map';

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

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const TOOLS: { id: MapTool; label: string; hint: string; icon: typeof Hand }[] = [
  { id: 'pan', label: 'Pick', hint: 'Click a pin to add or drop that shop', icon: Hand },
  {
    id: 'radius',
    label: 'Radius',
    hint: 'Press on the map and drag out from your own door',
    icon: CircleDashed,
  },
  {
    id: 'lasso',
    label: 'Draw area',
    hint: 'Click corners around a block. Double-click to close it',
    icon: Lasso,
  },
];

export function PlaceStep({
  placement,
  onChange,
}: {
  placement: Placement;
  onChange: (placement: Placement) => void;
}) {
  const [query, setQuery] = useState('');
  const [areas, setAreas] = useState<AreaId[]>([]);
  const [groups, setGroups] = useState<GroupId[]>([]);
  const [tool, setTool] = useState<MapTool>('pan');
  const [focus, setFocus] = useState<Focus>(null);
  const [drawn, setDrawn] = useState<{ shape: string; added: number } | null>(null);
  /* State, not a ref: the Undo button is rendered from it, and a ref read
     during render would not re-render the bar when a shape lands. */
  const [previous, setPrevious] = useState<string[] | null>(null);

  const set = (patch: Partial<Placement>) => onChange({ ...placement, ...patch });
  const selected = placement.venues;

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
            placeholder="Search shops, streets, cuisines"
            aria-label="Search the network"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pick-sets">
          <div className="pick-set">
            <span className="pick-set-label">Neighbourhoods</span>
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
                    title={`${area.blurb}. Click to take all ${ids.length}; shift-click to filter the list.`}
                    onClick={(event) => {
                      if (event.shiftKey) {
                        setAreas(toggle(areas, area.id));
                        return;
                      }
                      toggleSet(ids);
                      setFocus({ at: area.at, zoom: area.zoom, key: Date.now() });
                      setDrawn({ shape: area.label, added: ids.length });
                    }}
                  >
                    {area.label} <i>{ids.length}</i>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pick-set">
            <span className="pick-set-label">Kinds of shop</span>
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
                    title={`${group.blurb}. Click to take all ${ids.length}; shift-click to filter the list.`}
                    onClick={(event) => {
                      if (event.shiftKey) {
                        setGroups(toggle(groups, group.id));
                        return;
                      }
                      toggleSet(ids);
                      setDrawn({ shape: group.label, added: ids.length });
                    }}
                  >
                    {group.label} <i>{ids.length}</i>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pick-bulk">
          <span>
            {visible.length === VENUES.length
              ? `${VENUES.length} shops`
              : `${visible.length} of ${VENUES.length} shown`}
          </span>
          <div>
            <button type="button" onClick={() => addMany(visible.map((venue) => venue.id))}>
              Select shown
            </button>
            <button type="button" onClick={() => replace([])}>
              Clear
            </button>
            {(areas.length > 0 || groups.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setAreas([]);
                  setGroups([]);
                }}
              >
                Reset filters
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
                  onMouseEnter={() => setFocus({ at: venue.at, zoom: 15, key: Date.now() })}
                >
                  <span className="pick-tick">{on && <Check size={13} />}</span>
                  <span className="pick-body">
                    <b>
                      {venue.name}
                      {venue.status === 'live' ? (
                        <em className="tag live">Live</em>
                      ) : (
                        <em className="tag soon">{venue.since}</em>
                      )}
                    </b>
                    <span className="pick-kind">
                      {venue.kind} · {areaLabel(venue.area)}
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
          {visible.length === 0 && <li className="pick-empty">Nothing matches that.</li>}
        </ul>

        <fieldset className="pick-ages">
          <legend>Who you hope to reach</legend>
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
          <p>A request on the booking, not a targeting guarantee: one rotation, whole room.</p>
        </fieldset>
      </div>

      <div className="pick-map">
        <fieldset className="map-tools">
          <legend className="visually-hidden">Map selection tools</legend>
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? 'on' : undefined}
              aria-pressed={tool === item.id}
              onClick={() => setTool(item.id)}
            >
              <item.icon size={14} /> {item.label}
            </button>
          ))}
          <span className="map-tool-hint">{TOOLS.find((item) => item.id === tool)?.hint}</span>
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
              <Undo2 size={14} /> Undo
            </button>
          )}
        </fieldset>

        <div className="map-frame">
          <SelectionMap
            venues={VENUES}
            selected={selected}
            tool={tool}
            focus={focus}
            onToggle={(id) => set({ venues: toggle(selected, id) })}
            onRegion={(ids, shape) => {
              addMany(ids);
              setDrawn({ shape, added: ids.length });
            }}
            onToolDone={() => setTool('pan')}
          />
          {drawn && (
            <output className="map-drawn">
              <MapPin size={13} /> {drawn.shape} · {drawn.added} shop
              {drawn.added === 1 ? '' : 's'} added
            </output>
          )}
        </div>

        <div className="map-foot">
          <div>
            <small>Shops</small>
            <b>
              {chosen.length}
              <i> of {VENUES.length}</i>
            </b>
          </div>
          <div>
            <small>Screens</small>
            <b>{chosen.reduce((total, venue) => total + venue.screens, 0)}</b>
          </div>
          <div>
            <small>Minutes a week</small>
            <b>{count.format(stock.minutes)}</b>
          </div>
          <div>
            <small>Heads past the board</small>
            <b>{count.format(totalFootfall(chosen))}</b>
          </div>
        </div>

        <p className="map-note">
          {live.length} of the {chosen.length || 0} shop{chosen.length === 1 ? '' : 's'} you have
          picked {live.length === 1 ? 'is' : 'are'} playing ads today. The rest are boards we are
          installing: they travel with your request and hold your slot, and nothing is billed for
          one until its screen is up.
        </p>
      </div>
    </div>
  );
}
