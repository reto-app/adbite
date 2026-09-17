/* Little square rooms, one per kind of shop, drawn in the same flat, thick
   lined way as the hero counter. No two are laid out alike: the taqueria
   hangs two vertical menus beside a narrow ad board, the barbershop runs one
   landscape screen with the ad down its right side, the salon has a tall
   portrait screen with the ad at its foot, and the café's chalkboard cuts to
   the ad and back. Same promise, four rooms. */

type Kind = 'restaurant' | 'barber' | 'salon' | 'cafe';

/* Every advertiser drawn on this page used to be the same coral, which read
   as one brand buying every board rather than eight neighbours buying one
   each. Each spot now carries its own colour; the initials inside the white
   chip follow it, through the `t-` class on the group. */
const TONE: Record<string, string> = {
  coral: '#de5540',
  green: '#2f6f63',
  plum: '#7a4b8f',
  navy: '#17557f',
  rose: '#bf2f62',
  ochre: '#a9660f',
  brick: '#b8341f',
  olive: '#4f7d3a',
};

/* three curls, drawn once and reused over anything hot */
function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g className="vs-steam" transform={`translate(${x} ${y})`}>
      <path className="one" d="M0 0c-3-3 3-5 0-9" />
      <path className="two" d="M6 2c-3-3 3-5 0-9" />
      <path className="three" d="M-6 2c-3-3 3-5 0-9" />
    </g>
  );
}

function Bulb({ x, y, drop }: { x: number; y: number; drop: number }) {
  return (
    <g>
      <path d={`M${x} 0v${drop}`} />
      <circle cx={x} cy={y} r="5" fill="#ffc72c" />
    </g>
  );
}

/* ---------------------------------------------------------------- rooms */

function Restaurant() {
  return (
    <>
      <rect width="120" height="90" fill="url(#vsWall-restaurant)" />
      <ellipse cx="20" cy="22" rx="22" ry="16" fill="url(#vsGlow-restaurant)" />

      {/* two vertical menus and, beside them, the slice that is sold */}
      <rect x="9" y="14" width="41" height="54" rx="3" fill="#0e0e0e" />
      <rect x="53" y="14" width="41" height="54" rx="3" fill="#0e0e0e" />
      <text className="vs-heading" x="14" y="26">TACOS</text>
      <text className="vs-heading" x="58" y="26">PLATES</text>
      <g className="vs-row vs-small">
        <text x="14" y="38">Asada</text>
        <text x="45" y="38" textAnchor="end">3.50</text>
        <text x="14" y="48">Pastor</text>
        <text x="45" y="48" textAnchor="end">3.50</text>
        <text x="14" y="58">Pollo</text>
        <text x="45" y="58" textAnchor="end">3.25</text>
        <text x="58" y="38">Burrito</text>
        <text x="89" y="38" textAnchor="end">9.00</text>
        <text x="58" y="48">Bowl</text>
        <text x="89" y="48" textAnchor="end">10.0</text>
        <text x="58" y="58">Nachos</text>
        <text x="89" y="58" textAnchor="end">8.00</text>
      </g>
      {[
        ['one', 'FC', 'FREEDOM CYCLES', 'coral'],
        ['two', '9S', 'NINTH ST BOOKS', 'green'],
      ].map(([slot, initials, name, tone]) => (
        <g className={`vs-ad ${slot} t-${tone}`} key={name}>
          <rect x="97" y="14" width="14" height="54" rx="3" fill={TONE[tone]} />
          <rect x="100.5" y="17" width="7" height="7" rx="1.6" fill="#fff6ee" />
          <text className="vs-ad-mark" x="104" y="22.3" textAnchor="middle">
            {initials}
          </text>
          <text
            className="vs-ad-name"
            x="104"
            y="46"
            textAnchor="middle"
            dominantBaseline="middle"
            transform="rotate(-90 104 46)"
          >
            {name}
          </text>
        </g>
      ))}

      <g stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M20 0v4" />
        <path d="M11 12l5-8h8l5 8z" fill="#ffc72c" />

        {/* counter: trays, a squeeze bottle and a plate going out */}
        <rect x="57" y="80" width="19" height="10" rx="2" fill="#d5dad7" />
        <line x1="57" y1="85" x2="76" y2="85" />
        <rect x="79" y="70" width="10" height="20" rx="2.5" fill="#de5540" />
        <rect x="81.5" y="66" width="5" height="5" rx="1" fill="#0e0e0e" />
        <ellipse cx="102" cy="88" rx="14" ry="3.5" fill="#ffffff" />
        <path d="M95 88a7 6 0 0 1 14 0" fill="#f0d9a8" />
        <path d="M97 86h10" stroke="#de5540" />
        <Steam x={102} y={76} />

        <rect x="-2" y="90" width="124" height="9" fill="#8c5a3a" />
        <rect x="-2" y="99" width="124" height="23" fill="#dcc6a6" />
        <path d="M32 99v23M88 99v23" />
      </g>
    </>
  );
}

function Barber() {
  return (
    <>
      <rect width="120" height="62" fill="#3f6f8c" />
      <rect y="62" width="120" height="28" fill="#eae3d6" />
      <path d="M0 62h120" stroke="#0e0e0e" strokeWidth="2" />
      <path
        d="M14 66v20M38 66v20M62 66v20M86 66v20M106 66v20"
        stroke="#cdc3b0"
        strokeWidth="2"
      />

      {/* one landscape screen, the ad down its right-hand side */}
      <rect x="18" y="10" width="84" height="46" rx="4" fill="#0e0e0e" />
      <text className="vs-heading" x="24" y="22">CUTS</text>
      <g className="vs-row">
        <text x="24" y="33">Fade</text>
        <text x="72" y="33" textAnchor="end">28</text>
        <text x="24" y="42">Beard trim</text>
        <text x="72" y="42" textAnchor="end">15</text>
        <text x="24" y="51">Hot shave</text>
        <text x="72" y="51" textAnchor="end">22</text>
      </g>
      {[
        ['one', 'IR', 'IRON ROSE', 'plum'],
        ['two', 'NP', 'NORTH PARK', 'navy'],
      ].map(([slot, initials, name, tone]) => (
        <g className={`vs-ad ${slot} t-${tone}`} key={name}>
          <rect x="77" y="14" width="21" height="38" rx="2.5" fill={TONE[tone]} />
          <rect x="84" y="17" width="7" height="7" rx="1.6" fill="#fff6ee" />
          <text className="vs-ad-mark" x="87.5" y="22.3" textAnchor="middle">
            {initials}
          </text>
          <text
            className="vs-ad-name"
            x="87.5"
            y="39"
            textAnchor="middle"
            dominantBaseline="middle"
            transform="rotate(-90 87.5 39)"
          >
            {name}
          </text>
        </g>
      ))}

      <g stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Bulb x={12} y={9} drop={4} />
        <Bulb x={108} y={9} drop={4} />

        {/* the pole, and the tools of the trade */}
        <rect x="58" y="62" width="12" height="28" rx="6" fill="#ffffff" />
        <g clipPath="url(#vsPole)">
          <g className="vs-pole">
            {[56, 64, 72, 80, 88, 96].map((y) => (
              <path key={y} d={`M56 ${y}L72 ${y - 10}v5L56 ${y + 5}z`} fill="#de5540" stroke="none" />
            ))}
          </g>
        </g>
        <rect x="58" y="62" width="12" height="28" rx="6" fill="none" />
        <rect x="55" y="58" width="18" height="6" rx="2" fill="#0e0e0e" />
        <rect x="80" y="82" width="18" height="8" rx="2" fill="#17557f" />
        <path d="M83 82v-4M88 82v-4M93 82v-4" />
        <rect x="102" y="74" width="14" height="16" rx="2.5" fill="#d5dad7" />
        <rect x="105" y="70" width="8" height="5" rx="1.5" fill="#0e0e0e" />

        <rect x="-2" y="90" width="124" height="8" fill="#0e0e0e" />
        <rect x="-2" y="98" width="124" height="24" fill="#ffffff" />
        <g fill="#0e0e0e" stroke="none">
          <rect x="0" y="98" width="12" height="12" />
          <rect x="24" y="98" width="12" height="12" />
          <rect x="48" y="98" width="12" height="12" />
          <rect x="72" y="98" width="12" height="12" />
          <rect x="96" y="98" width="12" height="12" />
          <rect x="12" y="110" width="12" height="12" />
          <rect x="36" y="110" width="12" height="12" />
          <rect x="60" y="110" width="12" height="12" />
          <rect x="84" y="110" width="12" height="12" />
          <rect x="108" y="110" width="12" height="12" />
        </g>
      </g>
    </>
  );
}

function Salon() {
  return (
    <>
      <rect width="120" height="90" fill="url(#vsWall-salon)" />

      {/* a lit vanity mirror, and a tall screen beside it */}
      <rect x="12" y="18" width="44" height="48" rx="8" fill="#dfeaf3" />
      <rect x="64" y="8" width="44" height="62" rx="4" fill="#0e0e0e" />
      <text className="vs-heading" x="69" y="20">COLOR</text>
      <g className="vs-row">
        <text x="69" y="32">Gloss</text>
        <text x="103" y="32" textAnchor="end">45</text>
        <text x="69" y="41">Blowout</text>
        <text x="103" y="41" textAnchor="end">35</text>
        <text x="69" y="50">Trim</text>
        <text x="103" y="50" textAnchor="end">30</text>
      </g>
      {[
        ['one', 'MF', 'Mia’s Flowers', 'rose'],
        ['two', '9S', 'Ninth St Books', 'ochre'],
      ].map(([slot, initials, name, tone]) => (
        <g className={`vs-ad ${slot} t-${tone}`} key={name}>
          <rect x="67" y="52" width="38" height="15" rx="2.5" fill={TONE[tone]} />
          <rect x="69.5" y="54.5" width="7" height="7" rx="1.6" fill="#fff6ee" />
          <text className="vs-ad-mark" x="73" y="59.8" textAnchor="middle">
            {initials}
          </text>
          <text className="vs-ad-name vs-small" x="69.5" y="65.5">
            {name}
          </text>
        </g>
      ))}

      <g stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="12" y="18" width="44" height="48" rx="8" fill="none" />
        <path d="M20 60a12 12 0 0 1 8-16" strokeWidth="1.6" opacity="0.65" />
        <g fill="#ffc72c">
          <circle cx="20" cy="14" r="3.4" />
          <circle cx="34" cy="14" r="3.4" />
          <circle cx="48" cy="14" r="3.4" />
          <circle cx="8" cy="30" r="3.4" />
          <circle cx="8" cy="50" r="3.4" />
        </g>
        <g className="vs-twinkle" stroke="none" fill="#ffc72c">
          <path className="one" d="M58 24l1.6 3.4 3.4 1.6-3.4 1.6L58 34l-1.6-3.4L53 29l3.4-1.6z" />
          <path className="two" d="M110 84l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z" />
        </g>

        {/* bottles and a dryer on the vanity */}
        <rect x="14" y="70" width="9" height="20" rx="2" fill="#de5540" />
        <rect x="16" y="66" width="5" height="5" rx="1" fill="#0e0e0e" />
        <rect x="26" y="74" width="9" height="16" rx="2" fill="#92c4e8" />
        <rect x="28" y="70" width="5" height="5" rx="1" fill="#0e0e0e" />
        <rect x="38" y="78" width="8" height="12" rx="2" fill="#f0d9a8" />
        <path d="M50 90v-8a6 6 0 0 1 12 0v8" fill="#d5dad7" />
        <path d="M62 84h5" />

        <rect x="-2" y="90" width="124" height="9" fill="#efe7e0" />
        <rect x="-2" y="99" width="124" height="23" fill="#dfc4bb" />
        <path d="M40 99v23M96 99v23" />
      </g>
    </>
  );
}

function Cafe() {
  return (
    <>
      <rect width="120" height="90" fill="#cfe0ea" />
      <ellipse cx="26" cy="26" rx="22" ry="17" fill="url(#vsGlow-cafe)" />

      {/* the chalkboard cuts to the ad and back, the way a spot runs */}
      <rect x="8" y="12" width="66" height="50" rx="3" fill="#14342a" />
      <g className="vs-ad one">
        <rect x="12" y="16" width="58" height="42" rx="2" fill="none" stroke="#8fae9f" strokeWidth="1" />
        <text className="vs-heading vs-chalk" x="17" y="27">COFFEE</text>
        <g className="vs-row vs-chalk">
          <text x="17" y="38">Cold brew</text>
          <text x="65" y="38" textAnchor="end">5.00</text>
          <text x="17" y="46">Latte</text>
          <text x="65" y="46" textAnchor="end">4.50</text>
          <text x="17" y="54">Drip</text>
          <text x="65" y="54" textAnchor="end">3.25</text>
        </g>
      </g>
      <g className="vs-ad two t-brick">
        <rect x="8" y="12" width="66" height="50" rx="3" fill={TONE.brick} />
        <rect x="14" y="17" width="9" height="9" rx="2" fill="#fff6ee" />
        <text className="vs-ad-mark vs-big" x="18.5" y="23.6" textAnchor="middle">RB</text>
        <text className="vs-ad-name vs-big" x="14" y="40">Rosewood</text>
        <text className="vs-ad-name vs-big" x="14" y="49">Barbers</text>
        <text className="vs-ad-name vs-small" x="14" y="57">Walk-ins till seven</text>
      </g>

      <g stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Bulb x={92} y={14} drop={9} />

        {/* a shelf of jars over the machine */}
        <rect x="80" y="34" width="36" height="4" rx="1" fill="#b98f5e" />
        <rect x="84" y="24" width="9" height="10" rx="2" fill="#f0d9a8" />
        <rect x="97" y="26" width="8" height="8" rx="2" fill="#ffffff" />
        <path d="M108 34v-6a4 4 0 0 1 8 0v6" fill="#2f6f63" />

        {/* machine, cup and a dome of pastries */}
        <rect x="56" y="64" width="31" height="26" rx="3" fill="#d5dad7" />
        <rect x="62" y="68" width="19" height="9" rx="1.5" fill="#16211e" />
        <rect x="65" y="85" width="10" height="5" rx="1" fill="#0e0e0e" />
        <path d="M87 70h6v6" />
        <path d="M92 80h12v6a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" fill="#ffffff" />
        <path d="M104 82h3a3 3 0 0 1 0 6h-3" />
        <Steam x={98} y={76} />

        <rect x="-2" y="90" width="124" height="9" fill="#2f6f63" />
        <rect x="-2" y="99" width="124" height="23" fill="#e8dcc8" />
        <path d="M30 99v23M86 99v23" />
      </g>
    </>
  );
}

const ROOMS: Record<Kind, () => React.ReactElement> = {
  restaurant: Restaurant,
  barber: Barber,
  salon: Salon,
  cafe: Cafe,
};

export function VenueScene({ kind }: { kind: Kind }) {
  const Room = ROOMS[kind];
  return (
    <svg className={`vs vs-${kind}`} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        {kind === 'restaurant' && (
          <pattern id="vsWall-restaurant" width="24" height="12" patternUnits="userSpaceOnUse">
            <rect width="24" height="12" fill="#bd7461" />
            <g fill="#eaddcd">
              <rect width="24" height="1.4" />
              <rect y="6" width="24" height="1.4" />
              <rect width="1.4" height="5" y="1.4" />
              <rect x="12" y="7.4" width="1.4" height="5" />
            </g>
          </pattern>
        )}
        {kind === 'salon' && (
          <pattern id="vsWall-salon" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#e9cfc7" />
            <rect width="3" height="12" fill="#dcb3a8" />
          </pattern>
        )}
        {kind === 'barber' && (
          <clipPath id="vsPole">
            <rect x="58" y="62" width="12" height="28" rx="6" />
          </clipPath>
        )}
        {(kind === 'restaurant' || kind === 'cafe') && (
          <radialGradient id={`vsGlow-${kind}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffc72c" stopOpacity="0.34" />
            <stop offset="1" stopColor="#ffc72c" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <Room />
    </svg>
  );
}
