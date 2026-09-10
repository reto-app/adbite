'use client';

import { Check, Clock, ExternalLink, MapPin, Phone } from 'lucide-react';
import {
  AGE_BANDS,
  DAYPARTS,
  PILOT_CITY,
  VENUES,
  type AgeBand,
  type Daypart,
  type Venue,
} from '@/lib/network';
import { VenueMap } from '@/components/venue-map';

export type Placement = {
  venues: string[];
  ages: AgeBand[];
  dayparts: Daypart[];
};

export const DEFAULT_PLACEMENT: Placement = {
  venues: VENUES.map((venue) => venue.id),
  ages: [],
  dayparts: [],
};

export function chosenVenues(placement: Placement): Venue[] {
  return VENUES.filter((venue) => placement.venues.includes(venue.id));
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function PlaceStep({
  placement,
  onChange,
}: {
  placement: Placement;
  onChange: (placement: Placement) => void;
}) {
  const chosen = chosenVenues(placement);
  const set = (patch: Partial<Placement>) => onChange({ ...placement, ...patch });

  return (
    <div className="place-step">
      <div className="prefs">
        <div className="prefs-panel">
          <div className="prefs-head">
            <h3>The pilot network</h3>
            <span className="prefs-hint">{PILOT_CITY}</span>
          </div>

          {VENUES.map((venue) => {
            const on = placement.venues.includes(venue.id);
            return (
              <button
                key={venue.id}
                type="button"
                className={`venue-card${on ? ' on' : ''}`}
                aria-pressed={on}
                onClick={() => set({ venues: toggle(placement.venues, venue.id) })}
              >
                <span className="venue-card-head">
                  <b>{venue.name}</b>
                  <span className="venue-tick">{on && <Check size={14} />}</span>
                </span>
                <span className="venue-kind">{venue.kind}</span>
                <span className="venue-line">
                  <MapPin size={13} /> {venue.street}, {venue.city}
                </span>
                <span className="venue-line">
                  <Clock size={13} /> {venue.hours}
                </span>
                <span className="venue-line">
                  <Phone size={13} /> {venue.phone}
                </span>
                <span className="venue-screens">
                  {venue.screens} screen · {venue.board}
                </span>
              </button>
            );
          })}

          <p className="prefs-note">
            One shop is in the pilot today. Every campaign you book here runs on their board and
            nowhere else, and they approve the creative before it plays.
          </p>

          <fieldset>
            <legend>Ask for a time of day</legend>
            <div className="chip-row">
              {DAYPARTS.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className={`chip${placement.dayparts.includes(part.id) ? ' on' : ''}`}
                  aria-pressed={placement.dayparts.includes(part.id)}
                  onClick={() => set({ dayparts: toggle(placement.dayparts, part.id) })}
                >
                  {part.label} <i>{part.window}</i>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Who you are hoping to reach</legend>
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
          </fieldset>

          <p className="prefs-note">
            Both of these travel with the booking as a request, not a targeting guarantee. The shop
            runs one rotation for everyone in the room, so we will not pretend to split it finer
            than that.
          </p>
        </div>
      </div>

      <div className="map-side">
        <div className="map-frame">
          <VenueMap venues={VENUES} zoom={15} />
        </div>
        <div className="map-foot">
          <div>
            <small>Shops selected</small>
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
            <small>City</small>
            <b className="map-city">Provo</b>
          </div>
        </div>
        {VENUES[0] && (
          <a
            className="map-link"
            href={`https://${VENUES[0].site}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {VENUES[0].site} <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
