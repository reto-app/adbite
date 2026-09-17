/* What the screen plays when no ad is running.
 *
 * The video format does not interrupt a menu, it interrupts the shop's own
 * food, so the card underneath the spot has to be food rather than a price
 * list. Drawn here for the same reasons as the gym spot next door: sharp at
 * any size, no download, and it loops without a video element. Styles live
 * in globals.css under `.fs-`. */
export function FoodScene() {
  return (
    <svg
      className="fs"
      viewBox="0 0 340 214"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fsCloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f1d14" />
          <stop offset="1" stopColor="#1b100b" />
        </linearGradient>
        <radialGradient id="fsLamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc47a" stopOpacity="0.46" />
          <stop offset="1" stopColor="#ffc47a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the counter, lit from above, drifting the way a handheld shot does */}
      <g className="fs-scene">
        <rect width="340" height="214" fill="url(#fsCloth)" />
        <ellipse cx="170" cy="96" rx="168" ry="112" fill="url(#fsLamp)" />
        <rect y="156" width="340" height="58" fill="#3a2418" />
        <path d="M0 156h340" stroke="#5c3a25" strokeWidth="2" />

        {/* a board of tacos, mid service */}
        <g>
          <rect x="52" y="104" width="236" height="62" rx="10" fill="#b98f5e" />
          <rect x="52" y="104" width="236" height="10" rx="5" fill="#cfa473" />

          {[76, 152, 228].map((x, i) => (
            <g key={x} className={`fs-taco n${i + 1}`}>
              {/* tortilla */}
              <path
                d={`M${x} 140a30 22 0 0 1 60 0z`}
                transform={`translate(${-30} ${-6})`}
                fill="#f0d9a8"
              />
              {/* filling */}
              <path
                d={`M${x - 24} 130q24 -16 48 0 -24 10 -48 0z`}
                fill="#8e3a1c"
              />
              {/* onion and coriander */}
              <circle cx={x - 12} cy="127" r="2.6" fill="#f6efe2" />
              <circle cx={x + 2} cy="125" r="2.4" fill="#f6efe2" />
              <circle cx={x + 13} cy="128" r="2.4" fill="#f6efe2" />
              <circle cx={x - 4} cy="130" r="2.8" fill="#4f7d3a" />
              <circle cx={x + 9} cy="131" r="2.4" fill="#4f7d3a" />
              {/* a wedge of lime */}
              <path d={`M${x + 20} 136a6 6 0 0 1 10 3z`} fill="#8fbf3f" />
            </g>
          ))}
        </g>

        {/* the flat-top behind, and the steam coming off it */}
        <g>
          <rect x="24" y="52" width="292" height="44" rx="8" fill="#2a1a12" />
          <rect x="34" y="60" width="272" height="28" rx="5" fill="#120b07" />
          <g className="fs-sear">
            <rect x="60" y="66" width="34" height="17" rx="5" fill="#7d3317" />
            <rect x="108" y="68" width="30" height="14" rx="5" fill="#8e3a1c" />
            <rect x="152" y="65" width="36" height="18" rx="5" fill="#6f2c13" />
            <rect x="202" y="68" width="30" height="14" rx="5" fill="#8e3a1c" />
            <rect x="246" y="66" width="34" height="17" rx="5" fill="#7d3317" />
          </g>
          <g
            className="fs-steam"
            stroke="#ffe9c9"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          >
            <path className="one" d="M92 58c-7-9 7-13 0-23" />
            <path className="two" d="M170 58c-7-9 7-13 0-23" />
            <path className="three" d="M248 58c-7-9 7-13 0-23" />
          </g>
        </g>

        {/* the cook's hand, turning one over */}
        <g className="fs-hand">
          <rect x="286" y="96" width="9" height="46" rx="4.5" fill="#2a1710" />
          <path d="M276 96h30v9h-30z" fill="#d5dad7" />
          <line
            x1="291"
            y1="142"
            x2="291"
            y2="176"
            stroke="#e7c3ab"
            strokeWidth="11"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
