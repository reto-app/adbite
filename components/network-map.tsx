'use client';

import { useEffect, useState } from 'react';

/* The network, as a cartoon of the country: the list scrolls on its own and
   the shop it lands on lights up on the map. These are the kinds of shops
   AdBite is opening with, drawn from the example boards used across the
   site; the pilot itself starts in Provo. */
const SHOPS = [
  { name: 'Rosas Taqueria', kind: 'Taqueria', city: 'Provo, UT', at: [80, 78] },
  { name: 'The Roost Shop', kind: 'Chicken shop', city: 'Denver, CO', at: [113, 81.6] },
  { name: 'Rosewood Barbers', kind: 'Barbershop', city: 'Boise, ID', at: [57.6, 54.1] },
  { name: 'Marigold Studio', kind: 'Salon', city: 'Phoenix, AZ', at: [78, 126.1] },
  { name: 'Forno Nove', kind: 'Pizzeria', city: 'Austin, TX', at: [148.9, 148.7] },
  { name: 'Meridian Café', kind: 'Café', city: 'Portland, OR', at: [25.5, 40.6] },
  { name: 'The Sunny Spoon', kind: 'Diner', city: 'Nashville, TN', at: [203.2, 107] },
  { name: 'Cedar + Co', kind: 'Barbershop', city: 'Minneapolis, MN', at: [171, 44.5] },
  { name: 'Blue Line Deli', kind: 'Deli', city: 'Chicago, IL', at: [198.9, 66.4] },
  { name: 'Harbor Cuts', kind: 'Barbershop', city: 'Seattle, WA', at: [27.2, 25.8] },
  { name: 'Poppy Nail Bar', kind: 'Nail salon', city: 'Sacramento, CA', at: [31.4, 89.8] },
  { name: 'Third Coast Tacos', kind: 'Taqueria', city: 'Kansas City, MO', at: [164.6, 86.1] },
  { name: 'Morningside Bagels', kind: 'Bakery', city: 'Brooklyn, NY', at: [266.7, 74.9] },
  { name: 'Gold Room Salon', kind: 'Salon', city: 'Atlanta, GA', at: [215, 124] },
];

const LAND =
  'M15.5 20.3 L18.0 37.2 L18.9 51.4 L18.9 76.9 L26.9 95.3 L35.8 118.7 L46.7 124.4 L53.1 132.9 L65.0 131.5 L83.3 141.4 L97.1 141.4 L105.6 137.8 L114.0 153.4 L122.9 157.7 L130.8 152.0 L142.2 176.1 L151.6 166.2 L161.5 158.4 L168.4 152.7 L181.3 156.2 L190.2 157.7 L195.1 148.5 L209.5 149.9 L216.4 149.9 L222.9 158.4 L231.3 184.6 L236.2 173.2 L234.2 157.7 L229.3 143.5 L241.7 129.3 L251.6 115.2 L259.0 94.6 L266.4 76.2 L280.3 69.8 L286.2 58.5 L301.1 47.2 L293.6 28.0 L278.8 44.3 L262.4 44.3 L252.5 51.4 L240.7 56.4 L222.4 67.7 L221.9 47.9 L213.0 38.0 L202.1 33.0 L187.2 32.3 L175.8 32.3 L162.5 16.0 L117.9 16.0 L63.5 16.0 L23.9 16.0 Z';

const DEFAULT_NOTE =
  'Shops of the kind AdBite is opening with. The pilot starts in Provo, Utah.';

export function NetworkMap({ note = DEFAULT_NOTE }: { note?: string } = {}) {
  /* `step` counts past the end of the list into a second copy of it, so the
     scroll never runs out of shops. When it lands on the copy we snap back
     to the top with the transition off, and nobody sees the seam. */
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState(false);
  const active = step % SHOPS.length;
  const here = SHOPS[active];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((s) => s + 1), 2600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step < SHOPS.length) return;
    const t = window.setTimeout(() => {
      setSnap(true);
      setStep((s) => s % SHOPS.length);
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
          <span>{SHOPS.length} shops</span>
        </div>
        <div className="network-scroller">
          <ol className={snap ? 'snap' : undefined} style={{ '--i': step } as React.CSSProperties}>
            {[...SHOPS, ...SHOPS].map((shop, n) => (
              <li key={`${shop.name}-${n}`} className={n % SHOPS.length === active ? 'on' : ''}>
                <button
                  type="button"
                  aria-pressed={n % SHOPS.length === active}
                  aria-label={`${shop.name}, ${shop.kind} in ${shop.city}`}
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
          A map of the network. Showing {here.name}, {here.kind} in {here.city}.
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

          {SHOPS.map((shop, i) => (
            <g key={shop.name} className={i === active ? 'nm-pin on' : 'nm-pin'}>
              {i === active && <circle className="nm-ping" cx={shop.at[0]} cy={shop.at[1]} r="6" />}
              <circle cx={shop.at[0]} cy={shop.at[1]} r={i === active ? 5.4 : 3.4} />
            </g>
          ))}

          <g className="nm-callout" transform={`translate(${here.at[0]} ${here.at[1]})`}>
            <path d="M0 -6l4 -9h-8z" />
            <rect x="-10" y="-33" width={here.name.length * 4.7 + 20} height="19" rx="5" />
            <text className="nm-callout-name" x="0" y="-20">
              {here.name}
            </text>
          </g>
        </svg>
        <figcaption>{note}</figcaption>
      </figure>
    </div>
  );
}
