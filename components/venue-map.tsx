'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Venue } from '@/lib/network';

/* A real slippy map, on real OpenStreetMap tiles. Leaflet touches `document`
   as it initialises, so it is imported inside the effect and never during the
   prerender. */
export function VenueMap({
  venues,
  zoom = 15,
  interactive = true,
  className,
}: {
  venues: Venue[];
  zoom?: number;
  interactive?: boolean;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let map: import('leaflet').Map | undefined;
    let cancelled = false;
    let settle: number | undefined;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !host.current) return;

      const centre = venues[0]?.at ?? [40.242636, -111.66201];
      map = L.map(node, {
        center: centre,
        zoom,
        scrollWheelZoom: false,
        zoomControl: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        keyboard: interactive,
        attributionControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      for (const venue of venues) {
        L.marker(venue.at, {
          icon: L.divIcon({
            className: 'venue-pin',
            html: `<span class="venue-pin-dot"></span>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          keyboard: false,
          alt: venue.name,
        })
          .addTo(map)
          .bindPopup(
            `<b>${venue.name}</b><br>${venue.street}<br>${venue.screens} screen`,
          );
      }

      if (venues.length > 1) {
        /* Not animated. An animated fit leaves a `transitionend` pending on
           the map pane, and this map is unmounted mid-flight all the time —
           switching a report tab does it — at which point Leaflet finishes the
           zoom against panes `remove()` has already torn down and throws
           "Cannot read properties of undefined (reading '_leaflet_pos')".
           There is nothing to animate away from here anyway: this is the
           opening frame. */
        map.fitBounds(L.latLngBounds(venues.map((venue) => venue.at)).pad(0.25), {
          animate: false,
        });
      }

      // The container is often still being laid out on the first paint.
      settle = window.setTimeout(() => map?.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      if (settle) window.clearTimeout(settle);
      map?.stop();
      map?.remove();
    };
  }, [venues, zoom, interactive]);

  return <div ref={host} className={`venue-map${className ? ` ${className}` : ''}`} />;
}
