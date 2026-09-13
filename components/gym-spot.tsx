/* The short-video card plays an actual spot rather than three text cards:
   fifteen seconds of a gym, drawn here so it stays sharp at any size and
   costs no download. Every animated group is a leaf whose own geometry is
   static, so `transform-box: fill-box` resolves each joint to a fixed point
   (a rotating child would otherwise drag its parent's bounding box around).
   Styles live with the rest of the site in globals.css, under `.gs-`. */
export function GymSpot() {
  return (
    <svg className="gs" viewBox="-10 -26 340 204" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="gsWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8341f" />
          <stop offset="1" stopColor="#d4522c" />
        </linearGradient>
        <linearGradient id="gsFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efa04b" />
          <stop offset="1" stopColor="#e0813a" />
        </linearGradient>
        <radialGradient id="gsGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd9a8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the whole room drifts, the way a locked-off camera never quite is */}
      <g className="gs-scene">
        <rect x="-10" y="-26" width="340" height="144" fill="url(#gsWall)" />
        <ellipse cx="186" cy="44" rx="130" ry="86" fill="url(#gsGlow)" />
        <rect x="-10" y="118" width="340" height="62" fill="url(#gsFloor)" />
        <rect x="-10" y="112" width="340" height="7" fill="#8e2415" opacity="0.55" />
        <path d="M-10 142h340M-10 168h340" stroke="#cf7433" strokeWidth="1.5" opacity="0.55" />

        {/* wall sign */}
        <g>
          <rect x="110" y="2" width="100" height="23" rx="5" fill="#2a1710" />
          <text className="gs-sign" x="124" y="18">IRON ROSE</text>
          <circle cx="117" cy="13.5" r="2.4" fill="#92c4e8" />
        </g>

        {/* clock */}
        <g>
          <circle cx="292" cy="44" r="10" fill="#fff6ee" opacity="0.94" />
          <circle cx="292" cy="44" r="10" fill="none" stroke="#2a1710" strokeWidth="2" />
          <line x1="292" y1="44" x2="292" y2="38" stroke="#2a1710" strokeWidth="2" strokeLinecap="round" />
          <g transform="translate(292 44)">
            <g className="gs-hand">
              <line x1="0" y1="0" x2="0" y2="-8" stroke="#c9482a" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
          <circle cx="292" cy="44" r="1.6" fill="#2a1710" />
        </g>

        {/* dumbbell rack */}
        <g fill="#2a1710">
          <rect x="236" y="70" width="6" height="48" rx="2" />
          <rect x="298" y="70" width="6" height="48" rx="2" />
          <rect x="236" y="70" width="68" height="5" rx="2" />
          <rect x="236" y="88" width="68" height="5" rx="2" />
          <rect x="236" y="106" width="68" height="5" rx="2" />
          {[80, 98].map((y) =>
            [248, 266, 284].map((x) => (
              <g key={`${x}-${y}`}>
                <rect x={x} y={y} width="4" height="8" rx="1.5" />
                <rect x={x + 9} y={y} width="4" height="8" rx="1.5" />
                <rect x={x + 3} y={y + 2.5} width="7" height="3" rx="1.5" />
              </g>
            )),
          )}
        </g>

        {/* loose plates and a kettlebell, left on the floor */}
        <g>
          <circle cx="156" cy="107" r="9" fill="#2a1710" />
          <circle cx="156" cy="107" r="3" fill="#e2843c" />
          <circle cx="164" cy="109" r="9" fill="#33200f" />
          <circle cx="164" cy="109" r="3" fill="#e2843c" />
          <path d="M176 104a5 5 0 0 1 10 0" fill="none" stroke="#2a1710" strokeWidth="2.4" />
          <circle cx="181" cy="111" r="6.5" fill="#2a1710" />
        </g>

        {/* mats */}
        <g fill="#7c2414">
          <rect x="32" y="113" width="128" height="9" rx="4.5" />
          <rect x="168" y="113" width="64" height="9" rx="4.5" />
        </g>

        {/* bench press: dumbbells on a flat bench */}
        <g className="gs-lifter">
          <g transform="translate(76 82)">
            <g className="gs-arm back">
            <line x1="0" y1="0" x2="0" y2="-27" stroke="#e7c3ab" strokeWidth="6" strokeLinecap="round" />
            <g fill="#33200f">
              <rect x="-9" y="-32" width="6" height="10" rx="2" />
              <rect x="3" y="-32" width="6" height="10" rx="2" />
              <rect x="-4" y="-28.5" width="8" height="3" rx="1.5" />
            </g>
          </g>
          </g>
          <line x1="50" y1="100" x2="44" y2="118" stroke="#2a1710" strokeWidth="5" strokeLinecap="round" />
          <line x1="128" y1="100" x2="134" y2="118" stroke="#2a1710" strokeWidth="5" strokeLinecap="round" />
          <rect x="38" y="95" width="106" height="9" rx="4.5" fill="#2a1710" />
          <polyline
            points="110,90 138,99 136,116"
            fill="none"
            stroke="#fff6ee"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="128" y="111" width="16" height="6" rx="3" fill="#2a1710" />
          <circle cx="52" cy="86" r="9" fill="#fff6ee" />
          <rect x="60" y="77" width="54" height="18" rx="9" fill="#92c4e8" />
          <g transform="translate(70 80)">
            <g className="gs-arm front">
            <line x1="0" y1="0" x2="0" y2="-27" stroke="#fff6ee" strokeWidth="6.5" strokeLinecap="round" />
            <g fill="#2a1710">
              <rect x="-9" y="-32" width="6" height="10" rx="2" />
              <rect x="3" y="-32" width="6" height="10" rx="2" />
              <rect x="-4" y="-28.5" width="8" height="3" rx="1.5" />
            </g>
          </g>
          </g>
        </g>

        {/* standing curls, arms alternating */}
        <g className="gs-curler">
          <rect x="180" y="112" width="15" height="6" rx="3" fill="#2a1710" />
          <rect x="197" y="112" width="15" height="6" rx="3" fill="#2a1710" />
          <line x1="191" y1="93" x2="189" y2="114" stroke="#fff6ee" strokeWidth="7" strokeLinecap="round" />
          <line x1="201" y1="93" x2="203" y2="114" stroke="#fff6ee" strokeWidth="7" strokeLinecap="round" />
          <rect x="186" y="61" width="21" height="35" rx="9.5" fill="#92c4e8" />
          <circle cx="196" cy="51" r="9.5" fill="#fff6ee" />
          <rect x="187" y="45" width="18" height="3.5" rx="1.75" fill="#92c4e8" />
          <line x1="189" y1="66" x2="182" y2="83" stroke="#fff6ee" strokeWidth="6" strokeLinecap="round" />
          <line x1="203" y1="66" x2="210" y2="83" stroke="#fff6ee" strokeWidth="6" strokeLinecap="round" />
          <g transform="translate(182 83)">
            <g className="gs-fore left">
            <line x1="0" y1="0" x2="0" y2="15" stroke="#fff6ee" strokeWidth="6" strokeLinecap="round" />
            <g fill="#2a1710">
              <rect x="-8" y="11" width="5.5" height="9" rx="2" />
              <rect x="2.5" y="11" width="5.5" height="9" rx="2" />
              <rect x="-3.5" y="13.8" width="7" height="3" rx="1.5" />
            </g>
          </g>
          </g>
          <g transform="translate(210 83)">
            <g className="gs-fore right">
            <line x1="0" y1="0" x2="0" y2="15" stroke="#fff6ee" strokeWidth="6" strokeLinecap="round" />
            <g fill="#2a1710">
              <rect x="-8" y="11" width="5.5" height="9" rx="2" />
              <rect x="2.5" y="11" width="5.5" height="9" rx="2" />
              <rect x="-3.5" y="13.8" width="7" height="3" rx="1.5" />
            </g>
          </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
