'use client';

import { useEffect, useRef, useState } from 'react';

/* The network, as a cartoon of the country with Utah pulled out of it.
 *
 * AdBite sells the Wasatch Front, so every shop below sits in one of three
 * counties: Salt Lake, Utah and Cache. At true scale those three are one
 * smudge a dozen pixels across, so the state is drawn again over its own
 * position at about three and a half times size, with the counties as fields
 * inside it. The country stays underneath for people who need to be told
 * where Utah is.
 *
 * Shops are scattered across their county rather than lined up along it. A
 * row of evenly spaced dots reads as a progress bar, which is the wrong idea
 * entirely: these are separate shops in separate places, and the eye should
 * see a spread.
 *
 * These are the kinds of shops AdBite is opening with, drawn from the example
 * boards used across the site. They are not customers. */

type CountyId = 'cache' | 'saltlake' | 'utah';

/* The enlarged state, and the three fields stacked inside it north to south.
   `y` is a field's top edge in the SVG's own units. */
const UTAH = 'M38.1 22.6 H89.2 V47 H123.2 V144.6 H38.1 Z';

const FIELD_X = 42;
const FIELD_W = 77;
const FIELD_H = 27;

const COUNTIES: { id: CountyId; label: string; y: number }[] = [
  { id: 'cache', label: 'Cache County', y: 52 },
  { id: 'saltlake', label: 'Salt Lake County', y: 82.5 },
  { id: 'utah', label: 'Utah County', y: 113 },
];

/* Where the shops sit inside a field, as offsets from its top-left corner.
   Placed by hand rather than generated: they have to miss the county name in
   the top left and the count in the top right, and still look thrown. */
const SCATTER: Record<number, [number, number][]> = {
  4: [
    [10, 19],
    [26, 15],
    [46, 21],
    [62, 9],
  ],
  5: [
    [8, 20],
    [22, 15],
    [38, 21],
    [57, 8],
    [67, 17],
  ],
};

const SHOPS: { name: string; kind: string; city: string; county: CountyId }[] = [
  { name: 'Rosewood Barbers', kind: 'Barbershop', city: 'Logan, UT', county: 'cache' },
  { name: 'Morningside Bagels', kind: 'Bakery', city: 'Providence, UT', county: 'cache' },
  { name: 'The Sunny Spoon', kind: 'Diner', city: 'Smithfield, UT', county: 'cache' },
  { name: 'Canyon Road Tacos', kind: 'Taqueria', city: 'North Logan, UT', county: 'cache' },
  { name: 'The Roost Shop', kind: 'Chicken shop', city: 'Salt Lake City, UT', county: 'saltlake' },
  { name: 'Marigold Studio', kind: 'Salon', city: 'Sandy, UT', county: 'saltlake' },
  { name: 'Meridian Café', kind: 'Café', city: 'Millcreek, UT', county: 'saltlake' },
  { name: 'Blue Line Deli', kind: 'Deli', city: 'Murray, UT', county: 'saltlake' },
  { name: 'Wasatch Cuts', kind: 'Barbershop', city: 'Draper, UT', county: 'saltlake' },
  { name: 'Rosas Taqueria', kind: 'Taqueria', city: 'Provo, UT', county: 'utah' },
  { name: 'Forno Nove', kind: 'Pizzeria', city: 'Orem, UT', county: 'utah' },
  { name: 'Cedar + Co', kind: 'Barbershop', city: 'Lehi, UT', county: 'utah' },
  { name: 'Poppy Nail Bar', kind: 'Nail salon', city: 'American Fork, UT', county: 'utah' },
  { name: 'Gold Room Salon', kind: 'Salon', city: 'Spanish Fork, UT', county: 'utah' },
];

/* One pass that both orders the list and places the shops, so the scroller
   walks the map county by county and the two can never fall out of step. */
const PLACED = COUNTIES.flatMap((county) => {
  const here = SHOPS.filter((shop) => shop.county === county.id);
  const spots = SCATTER[here.length] ?? SCATTER[5];
  return here.map((shop, i) => {
    const [dx, dy] = spots[i % spots.length];
    return {
      ...shop,
      countyLabel: county.label,
      at: [FIELD_X + dx, county.y + dy] as [number, number],
      /* The name label sits off the state's right edge, level with the county,
         so it never lands on top of another county's shops. */
      labelY: county.y + FIELD_H / 2,
    };
  });
});

const LAND =
  'M15.5 20.3 L18.0 37.2 L18.9 51.4 L18.9 76.9 L26.9 95.3 L35.8 118.7 L46.7 124.4 L53.1 132.9 L65.0 131.5 L83.3 141.4 L97.1 141.4 L105.6 137.8 L114.0 153.4 L122.9 157.7 L130.8 152.0 L142.2 176.1 L151.6 166.2 L161.5 158.4 L168.4 152.7 L181.3 156.2 L190.2 157.7 L195.1 148.5 L209.5 149.9 L216.4 149.9 L222.9 158.4 L231.3 184.6 L236.2 173.2 L234.2 157.7 L229.3 143.5 L241.7 129.3 L251.6 115.2 L259.0 94.6 L266.4 76.2 L280.3 69.8 L286.2 58.5 L301.1 47.2 L293.6 28.0 L278.8 44.3 L262.4 44.3 L252.5 51.4 L240.7 56.4 L222.4 67.7 L221.9 47.9 L213.0 38.0 L202.1 33.0 L187.2 32.3 L175.8 32.3 L162.5 16.0 L117.9 16.0 L63.5 16.0 L23.9 16.0 Z';

const DEFAULT_NOTE =
  'The kinds of shops AdBite is opening with. The pilot runs across Salt Lake, Utah and Cache counties.';

export function NetworkMap({ note = DEFAULT_NOTE }: { note?: string } = {}) {
  /* `step` counts past the end of the list into a second copy of it, so the
     scroll never runs out of shops. When it lands on the copy we snap back
     to the top with the transition off, and nobody sees the seam. */
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState(false);
  /* The shops drop in when the map is actually looked at. Animating them on
     mount would spend the effect on a section most visitors are still
     scrolled well above. */
  const [seen, setSeen] = useState(false);
  const figure = useRef<HTMLElement | null>(null);
  const active = step % PLACED.length;
  const here = PLACED[active];

  useEffect(() => {
    const node = figure.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

      <figure className="network-figure" ref={figure}>
        <p className="visually-hidden">
          A map of the United States with Utah drawn large over it, split into the three counties
          AdBite is opening in. Showing {here.name}, {here.kind} in {here.city}, {here.countyLabel}.
        </p>
        <svg className={`nm${seen ? ' seen' : ''}`} viewBox="0 0 320 200" aria-hidden="true">
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
            <text className="nm-state-name" x="43" y="40">
              UTAH
            </text>

            {COUNTIES.map((county) => {
              const n = PLACED.filter((shop) => shop.county === county.id).length;
              return (
                <g key={county.id} className={county.id === here.county ? 'nm-band on' : 'nm-band'}>
                  <rect x={FIELD_X} y={county.y} width={FIELD_W} height={FIELD_H} rx="5" />
                  <text className="nm-band-name" x={FIELD_X + 4} y={county.y + 8}>
                    {county.label.toUpperCase()}
                  </text>
                  <text
                    className="nm-band-count"
                    x={FIELD_X + FIELD_W - 4}
                    y={county.y + 8}
                    textAnchor="end"
                  >
                    {n}
                  </text>
                </g>
              );
            })}

            {PLACED.map((shop, i) => (
              <g
                key={shop.name}
                className={i === active ? 'nm-pin on' : 'nm-pin'}
                style={{ '--n': i } as React.CSSProperties}
              >
                {i === active && (
                  <circle className="nm-ping" cx={shop.at[0]} cy={shop.at[1]} r="6" />
                )}
                <circle cx={shop.at[0]} cy={shop.at[1]} r={i === active ? 4.6 : 3} />
              </g>
            ))}
          </g>

          {/* the name, parked off the state's edge and level with its county */}
          <line className="nm-leader" x1={here.at[0]} y1={here.at[1]} x2="127" y2={here.labelY} />
          <g className="nm-callout" transform={`translate(127 ${here.labelY})`}>
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
