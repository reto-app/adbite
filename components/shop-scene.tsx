type Ad = { label: string; brand: string; detail: string; color: string };

/* The hero scene: a neighborhood shop counter with three boards hung above it.
   Two are the shop's own chalk menus; the third is the rotating local ad, so
   the split the whole product is about is visible at a glance. */
export function ShopScene({
  ads,
  activeAd,
  onSelectAd,
}: {
  ads: Ad[];
  activeAd: number;
  onSelectAd: (index: number) => void;
}) {
  const current = ads[activeAd];
  return (
    <div className="shop">
      <p className="visually-hidden">
        An illustrated shop counter with three boards above it. Two hold the
        shop&rsquo;s own menu; the third is showing a local ad for {current.brand}.
      </p>
      <div className="shop-scene" aria-hidden="true">
        <div className="wall">
          <span className="lamp one" />
          <span className="lamp two" />

          <div className="boards">
            <div className="board menu">
              <b>Breakfast</b>
              <p>Avocado toast <i>12</i></p>
              <p>Chilaquiles <i>14</i></p>
              <p>Egg + cheddar <i>8</i></p>
              <p>Side of fruit <i>5</i></p>
            </div>
            <div className="board menu">
              <b>Drinks</b>
              <p>Cold brew <i>5</i></p>
              <p>Lemonade <i>4</i></p>
              <p>Hibiscus tea <i>4</i></p>
              <p>Hot chocolate <i>5</i></p>
            </div>
            <div className={`board ad ${current.color}`} key={activeAd}>
              <strong>{current.brand}</strong>
              <p>{current.detail}</p>
            </div>
          </div>

          <div className="shop-sign">The Sunny Spoon</div>

          <div className="props">
            <span className="machine" />
            <span className="cups" />
            <span className="dome" />
            <span className="register" />
          </div>
        </div>

        <div className="counter-top" />
        <div className="counter-front" />
      </div>

      <div className="scene-caption">
        <span>Two boards yours. One board earning.</span>
        <div className="ad-dots">
          {ads.map((ad, i) => (
            <button
              key={ad.brand}
              aria-label={`Show the ${ad.brand} example`}
              aria-pressed={i === activeAd}
              className={i === activeAd ? 'on' : ''}
              onClick={() => onSelectAd(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
