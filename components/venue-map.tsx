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
        map.fitBounds(L.latLngBounds(venues.map((venue) => venue.at)).pad(0.25));
      }

      // The container is often still being laid out on the first paint.
      window.setTimeout(() => map?.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [venues, zoom, interactive]);

  return <div ref={host} className={`venue-map${className ? ` ${className}` : ''}`} />;
}
