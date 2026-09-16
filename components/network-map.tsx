'use client';

import { useEffect, useState } from 'react';

/* The network, as a cartoon of the country with Utah pulled out of it.
 *
 * AdBite sells the Wasatch Front, so every shop sits in one of three counties:
 * Cache, Salt Lake and Utah. At true scale those three are one smudge a dozen
 * pixels across, so the state is drawn again over its own position at about
 * four times size. The country stays underneath for people who need to be
 * told where Utah is.
 *
 * Only the shop whose turn it is shows. That is what lets every shop sit at
 * its real coordinates rather than at some spaced-out approximation of them:
 * the Wasatch Front really is one thin north-south line of towns, and the
 * markers really would pile on top of each other, but they are never on
 * screen together, so it costs nothing. What you get instead is a light
 * travelling down the actual road, which is the truer picture anyway.
 *
 * These are the kinds of shops AdBite is opening with, drawn from the example
 * boards used across the site. They are not customers. */

type CountyId = 'cache' | 'saltlake' | 'utah';

/* Utah at about four times size, over its own place on the country. The two
   corner steps are the Wyoming notch, which is what makes a plain rectangle
   read as the state. */
const UTAH = 'M30 20 H90.8 V49.1 H131.4 V165.4 H30 Z';

/* The box that shape occupies, and the state's real corners, so a latitude
   and longitude can be put on it. Everything on the state goes through
   `project`; nothing here is positioned by eye. */
const BOX = { x: 30, y: 20, w: 101.4, h: 145.4 };
const BOUNDS = { west: -114.05, east: -109.05, north: 42, south: 37 };

function project(lat: number, lng: number): [number, number] {
  return [
    BOX.x + ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * BOX.w,
    BOX.y + ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * BOX.h,
  ];
}

/* County names sit out in the West Desert, each at its own county's latitude.
   That half of the state is empty on a real map too. They are set over two
   lines because on one they run east far enough to reach the shops, which are
   all crowded against the mountains in a band about four units wide. */
const NAME_X = 34;
const NAME_LEADING = 5.6;

/* `labelLat` is where the name is written, not where the county is. Salt Lake
   and Utah counties share a border, so at their own latitudes two two-line
   names land on top of each other; these are pushed a little apart. The shops
   are not moved, only the writing. */
const COUNTIES: { id: CountyId; label: string; lines: [string, string]; labelLat: number }[] = [
  { id: 'cache', label: 'Cache County', lines: ['CACHE', 'COUNTY'], labelLat: 41.75 },
  { id: 'saltlake', label: 'Salt Lake County', lines: ['SALT LAKE', 'COUNTY'], labelLat: 40.8 },
  { id: 'utah', label: 'Utah County', lines: ['UTAH', 'COUNTY'], labelLat: 40.05 },
];

const SHOPS: {
  name: string;
  kind: string;
  city: string;
  county: CountyId;
  /** The town the shop is in, as geocoded. */
  at: [number, number];
}[] = [
  { name: 'The Sunny Spoon', kind: 'Diner', city: 'Smithfield, UT', county: 'cache', at: [41.8388, -111.8324] },
  { name: 'Canyon Road Tacos', kind: 'Taqueria', city: 'North Logan, UT', county: 'cache', at: [41.7688, -111.806] },
  { name: 'Rosewood Barbers', kind: 'Barbershop', city: 'Logan, UT', county: 'cache', at: [41.7355, -111.8344] },
  { name: 'Morningside Bagels', kind: 'Bakery', city: 'Providence, UT', county: 'cache', at: [41.7055, -111.8172] },
  { name: 'The Roost Shop', kind: 'Chicken shop', city: 'Salt Lake City, UT', county: 'saltlake', at: [40.7608, -111.891] },
  { name: 'Meridian Café', kind: 'Café', city: 'Millcreek, UT', county: 'saltlake', at: [40.6869, -111.875] },
  { name: 'Blue Line Deli', kind: 'Deli', city: 'Murray, UT', county: 'saltlake', at: [40.6669, -111.888] },
  { name: 'Marigold Studio', kind: 'Salon', city: 'Sandy, UT', county: 'saltlake', at: [40.5649, -111.8389] },
  { name: 'Wasatch Cuts', kind: 'Barbershop', city: 'Draper, UT', county: 'saltlake', at: [40.5247, -111.8638] },
  { name: 'Cedar + Co', kind: 'Barbershop', city: 'Lehi, UT', county: 'utah', at: [40.3916, -111.8508] },
  { name: 'Poppy Nail Bar', kind: 'Nail salon', city: 'American Fork, UT', county: 'utah', at: [40.3769, -111.7958] },
  { name: 'Forno Nove', kind: 'Pizzeria', city: 'Orem, UT', county: 'utah', at: [40.2969, -111.6946] },
  { name: 'Rosas Taqueria', kind: 'Taqueria', city: 'Provo, UT', county: 'utah', at: [40.2338, -111.6585] },
  { name: 'Gold Room Salon', kind: 'Salon', city: 'Spanish Fork, UT', county: 'utah', at: [40.115, -111.6549] },
];

/* Listed and lit north to south, so the light walks down the front in order
   rather than jumping about it. */
const PLACED = SHOPS.map((shop) => ({
  ...shop,
  countyLabel: COUNTIES.find((county) => county.id === shop.county)?.label ?? '',
  xy: project(shop.at[0], shop.at[1]),
}));

const LAND =
  'M15.5 20.3 L18.0 37.2 L18.9 51.4 L18.9 76.9 L26.9 95.3 L35.8 118.7 L46.7 124.4 L53.1 132.9 L65.0 131.5 L83.3 141.4 L97.1 141.4 L105.6 137.8 L114.0 153.4 L122.9 157.7 L130.8 152.0 L142.2 176.1 L151.6 166.2 L161.5 158.4 L168.4 152.7 L181.3 156.2 L190.2 157.7 L195.1 148.5 L209.5 149.9 L216.4 149.9 L222.9 158.4 L231.3 184.6 L236.2 173.2 L234.2 157.7 L229.3 143.5 L241.7 129.3 L251.6 115.2 L259.0 94.6 L266.4 76.2 L280.3 69.8 L286.2 58.5 L301.1 47.2 L293.6 28.0 L278.8 44.3 L262.4 44.3 L252.5 51.4 L240.7 56.4 L222.4 67.7 L221.9 47.9 L213.0 38.0 L202.1 33.0 L187.2 32.3 L175.8 32.3 L162.5 16.0 L117.9 16.0 L63.5 16.0 L23.9 16.0 Z';

const DEFAULT_NOTE =
  'The kinds of shops AdBite is opening with, each in its own town. The pilot runs across Salt Lake, Utah and Cache counties.';

export function NetworkMap({ note = DEFAULT_NOTE }: { note?: string } = {}) {
  /* `step` counts past the end of the list into a second copy of it, so the
     scroll never runs out of shops. When it lands on the copy we snap back
     to the top with the transition off, and nobody sees the seam. */
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState(false);
  const active = step % PLACED.length;
  const here = PLACED[active];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((s) => s + 1), 2600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step < PLACED.length) return;
    const t = window.setTimeout(() => {
      setSnap(true);
      setStep((s) => s % PLACED.length);
    }, 600);
    return () => window.clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!snap) return;
    const frame = requestAnimationFrame(() => setSnap(false));
    return () => cancelAnimationFrame(frame);
  }, [snap]);

  return (
    <div className="network-grid">
      <div className="network-list">
        <div className="network-list-head">
          <b>On the network</b>
          <span>
            {PLACED.length} shops · {COUNTIES.length} counties
          </span>
        </div>
        <div className="network-scroller">
          <ol className={snap ? 'snap' : undefined} style={{ '--i': step } as React.CSSProperties}>
            {[...PLACED, ...PLACED].map((shop, n) => (
              <li key={`${shop.name}-${n}`} className={n % PLACED.length === active ? 'on' : ''}>
                <button
                  type="button"
                  aria-pressed={n % PLACED.length === active}
                  aria-label={`${shop.name}, ${shop.kind} in ${shop.city}, ${shop.countyLabel}`}
                  onClick={() => setStep(n)}
                >
                  <i />
                  <span>
                    <b>{shop.name}</b>
                    <em>
                      {shop.kind} · {shop.city}
                    </em>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <figure className="network-figure">
        <p className="visually-hidden">
          A map of the United States with Utah drawn large over it, marking the shop whose turn it
          is. Showing {here.name}, {here.kind} in {here.city}, {here.countyLabel}.
        </p>
        <svg className="nm" viewBox="0 0 320 200" aria-hidden="true">
          <defs>
            <clipPath id="nmLand">
              <path d={LAND} />
            </clipPath>
          </defs>

          <path d={LAND} fill="#ffffff" />
          <g clipPath="url(#nmLand)" stroke="#d3dde5" strokeWidth="1.6">
            <path d="M52 0v200M84 0v200M116 0v200M148 0v200M180 0v200M212 0v200M244 0v200" />
            <path d="M0 56h320M0 92h320M0 124h320" />
          </g>
          <path d={LAND} fill="none" stroke="#0e0e0e" strokeWidth="2.4" strokeLinejoin="round" />

          {/* the state, enlarged in place, with the site's offset shadow */}
          <g className="nm-state">
            <path className="nm-state-shadow" d={UTAH} transform="translate(4 4)" />
            <path className="nm-state-face" d={UTAH} />
            {/* The southern two thirds of the state has no shops on it and
                never will at pilot scale, so the state's own name goes there
                rather than fighting Cache County for the top left. */}
            <text className="nm-state-name" x="80" y="132" textAnchor="middle">
              UTAH
            </text>

            {COUNTIES.map((county) => {
              const top = project(county.labelLat, BOUNDS.west)[1];
              return (
                <text
                  key={county.id}
                  className={county.id === here.county ? 'nm-county-name on' : 'nm-county-name'}
                  x={NAME_X}
                  y={top}
                >
                  {county.lines.map((line, i) => (
                    <tspan key={line} x={NAME_X} y={top + i * NAME_LEADING}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}

            {/* Every shop is drawn and all but one are transparent. Keeping
                them mounted is what lets the light cross-fade from town to
                town rather than blink out here and in over there. */}
            {PLACED.map((shop, i) => (
              <circle
                key={shop.name}
                className={i === active ? 'nm-pin on' : 'nm-pin'}
                cx={shop.xy[0]}
                cy={shop.xy[1]}
                r="4.6"
              />
            ))}
          </g>

          {/* The name is parked off the state's edge, level with the shop,
              and the leader lives inside the group with it. A <line>'s ends
              are attributes rather than styles, so leaving it outside meant
              the label teleported to the next shop while the marker was
              still fading out of the last one, pointing at nothing for a
              third of a second. As one group it glides, and its fixed length
              covers the whole width the front occupies. */}
          <g className="nm-callout" transform={`translate(141 ${here.xy[1]})`}>
            <line className="nm-leader" x1="-70" y1="0" x2="0" y2="0" />
            <path d="M0 -4l5 4l-5 4z" />
            <rect x="5" y="-9.5" width={here.name.length * 5.1 + 14} height="19" rx="5" />
            <text className="nm-callout-name" x="12" y="3.4">
              {here.name}
            </text>
          </g>
        </svg>
        <figcaption>{note}</figcaption>
      </figure>
    </div>
  );
}
