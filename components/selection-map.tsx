'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { distanceKm, pointInPolygon, type Venue } from '@/lib/network';

export type DrawnShape =
  | { kind: 'radius'; metres: number }
  | { kind: 'area'; points: number };

export type MapTool = 'pan' | 'radius' | 'lasso';

export type Focus = { at: [number, number]; zoom: number; key: number } | null;

/* The map is the second way to pick shops, and on a network of any size it is
   the faster one: circle the block your storefront is on, or lasso the strip
   you care about, rather than reading a list of names you do not know.
   
   Leaflet touches `document` as it initialises, so it is imported inside the
   effect and never during the prerender. The map instance is built once and
   then patched by narrower effects, because rebuilding it on every selection
   change threw the viewport away each time a pin was clicked. */
export function SelectionMap({
  venues,
  selected,
  tool,
  onToggle,
  onRegion,
  onToolDone,
  focus,
  highlight,
  className,
}: {
  venues: Venue[];
  selected: string[];
  tool: MapTool;
  onToggle: (id: string) => void;
  /** A drawn shape resolved to the shops inside it. The shape is described
      rather than named, so the caller can put it into words in its own
      language. */
  onRegion: (ids: string[], shape: DrawnShape) => void;
  onToolDone: () => void;
  focus: Focus;
  /** The shop the list is pointing at. Lights its pin; never moves the map. */
  highlight?: string | null;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const markers = useRef(new Map<string, import('leaflet').Marker>());
  const shape = useRef<import('leaflet').Layer | null>(null);
  const draft = useRef<[number, number][]>([]);
  /* Leaflet is imported inside the build effect, so it lands a tick after the
     effects that draw on it. They wait on this rather than running once
     against a map that does not exist yet and never running again. */
  const [ready, setReady] = useState(false);

  /* Handlers live in a ref so the map is never torn down to pick up a new
     closure. Written in an effect rather than during render, because a render
     that React later discards must not leave the map holding its callbacks. */
  const handlers = useRef({ onToggle, onRegion, onToolDone, venues, selected, tool });
  useEffect(() => {
    handlers.current = { onToggle, onRegion, onToolDone, venues, selected, tool };
  });

  /* ---- build the map once ---- */
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !host.current || map.current) return;
      leaflet.current = L;

      const instance = L.map(node, {
        center: [40.2605, -111.665],
        zoom: 12,
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: true,
      });
      map.current = instance;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(instance);

      instance.fitBounds(
        L.latLngBounds(handlers.current.venues.map((venue) => venue.at)).pad(0.12),
      );

      /* The pane is sized by a flex chain that settles after the first paint,
         so Leaflet's initial measurement is of a box that no longer exists and
         it never asks for the tiles that would cover the real one. */
      observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(node);
      setReady(true);
    })();

    const pins = markers.current;
    return () => {
      cancelled = true;
      observer?.disconnect();
      /* Stop before removing: a pan or zoom still in flight will otherwise
         land on panes `remove()` has already torn down. */
      map.current?.stop();
      map.current?.remove();
      map.current = null;
      pins.clear();
    };
  }, []);

  /* ---- pins, and which of them are on ---- */
  useEffect(() => {
    const L = leaflet.current;
    const instance = map.current;
    if (!L || !instance) return;

    for (const [id, marker] of markers.current) {
      if (!venues.some((venue) => venue.id === id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    for (const venue of venues) {
      const on = selected.includes(venue.id);
      const cls = `pin${on ? ' on' : ''}${venue.status === 'prospect' ? ' prospect' : ''}${
        highlight === venue.id ? ' hot' : ''
      }`;
      const existing = markers.current.get(venue.id);
      const icon = L.divIcon({
        className: 'venue-pin',
        html: `<span class="${cls}"><i>${venue.screens}</i></span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      if (existing) {
        existing.setIcon(icon);
        continue;
      }

      const marker = L.marker(venue.at, { icon, keyboard: false, alt: venue.name })
        .addTo(instance)
        .bindTooltip(
          `<b>${venue.name}</b><br>${venue.kind}<br>${venue.screens} screen${venue.screens > 1 ? 's' : ''}`,
          { direction: 'top', offset: [0, -12] },
        );
      marker.on('click', () => {
        if (handlers.current.tool === 'pan') handlers.current.onToggle(venue.id);
      });
      markers.current.set(venue.id, marker);
    }
  }, [venues, selected, highlight, ready]);

  /* ---- fly to a neighbourhood ---- */
  useEffect(() => {
    const instance = map.current;
    if (!instance || !focus) return;
    /* Cancel whatever is already moving first. A second flight started over a
       running zoom transition leaves Leaflet finishing the old one against a
       pane the new one has already re-based, and it throws on the way out. */
    instance.stop();
    instance.flyTo(focus.at, focus.zoom, { duration: 0.6 });
  }, [focus, ready]);

  /* ---- the drawing tools ---- */
  useEffect(() => {
    const L = leaflet.current;
    const instance = map.current;
    if (!L || !instance) return;

    const clear = () => {
      shape.current?.remove();
      shape.current = null;
      draft.current = [];
    };

    clear();

    if (tool === 'pan') {
      instance.dragging.enable();
      instance.doubleClickZoom.enable();
      instance.getContainer().style.cursor = '';
      return;
    }

    instance.getContainer().style.cursor = 'crosshair';
    instance.doubleClickZoom.disable();

    /* ---- circle a radius around a point ---- */
    if (tool === 'radius') {
      instance.dragging.disable();
      let centre: [number, number] | null = null;

      const down = (event: import('leaflet').LeafletMouseEvent) => {
        centre = [event.latlng.lat, event.latlng.lng];
        clear();
        const circle = L.circle(centre, { radius: 1, className: 'draw-shape' });
        circle.addTo(instance);
        shape.current = circle;
      };

      const move = (event: import('leaflet').LeafletMouseEvent) => {
        if (!centre || !shape.current) return;
        const km = distanceKm(centre, [event.latlng.lat, event.latlng.lng]);
        (shape.current as import('leaflet').Circle).setRadius(Math.max(40, km * 1000));
      };

      const up = () => {
        if (!centre || !shape.current) return;
        const metres = (shape.current as import('leaflet').Circle).getRadius();
        const inside = handlers.current.venues.filter(
          (venue) => distanceKm(centre!, venue.at) * 1000 <= metres,
        );
        handlers.current.onRegion(
          inside.map((venue) => venue.id),
          { kind: 'radius', metres },
        );
        centre = null;
        handlers.current.onToolDone();
      };

      instance.on('mousedown', down);
      instance.on('mousemove', move);
      instance.on('mouseup', up);
      return () => {
        instance.off('mousedown', down);
        instance.off('mousemove', move);
        instance.off('mouseup', up);
        instance.dragging.enable();
        instance.doubleClickZoom.enable();
        instance.getContainer().style.cursor = '';
        clear();
      };
    }

    /* ---- draw a neighbourhood by hand ---- */
    const click = (event: import('leaflet').LeafletMouseEvent) => {
      draft.current = [...draft.current, [event.latlng.lat, event.latlng.lng]];
      shape.current?.remove();
      const poly =
        draft.current.length > 2
          ? L.polygon(draft.current, { className: 'draw-shape' })
          : L.polyline(draft.current, { className: 'draw-shape' });
      poly.addTo(instance);
      shape.current = poly;
    };

    const close = () => {
      const points = draft.current;
      if (points.length < 3) return;
      const inside = handlers.current.venues.filter((venue) => pointInPolygon(venue.at, points));
      handlers.current.onRegion(
        inside.map((venue) => venue.id),
        { kind: 'area', points: points.length },
      );
      handlers.current.onToolDone();
    };

    const key = (event: KeyboardEvent) => {
      if (event.key === 'Enter') close();
      if (event.key === 'Escape') handlers.current.onToolDone();
    };

    instance.on('click', click);
    instance.on('dblclick', close);
    window.addEventListener('keydown', key);
    return () => {
      instance.off('click', click);
      instance.off('dblclick', close);
      window.removeEventListener('keydown', key);
      instance.doubleClickZoom.enable();
      instance.getContainer().style.cursor = '';
      clear();
    };
  }, [tool, ready]);

  return <div ref={host} className={`venue-map${className ? ` ${className}` : ''}`} />;
}
