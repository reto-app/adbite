type Ad = { label: string; brand: string; detail: string; color: string };

export type ShopMenu = { heading: string; items: [string, string][] };
export type Shop = { sign: string; wall: 'brick' | 'slats'; menus: [ShopMenu, ShopMenu] };

export const SUNNY_SPOON: Shop = {
  sign: 'The Sunny Spoon',
  wall: 'brick',
  menus: [
    {
      heading: 'Breakfast',
      items: [
        ['Avocado toast', '12'],
        ['Chilaquiles', '14'],
        ['Egg + cheddar', '8'],
        ['Side of fruit', '5'],
      ],
    },
    {
      heading: 'Drinks',
      items: [
        ['Cold brew', '5'],
        ['Lemonade', '4'],
        ['Hibiscus tea', '4'],
        ['Hot chocolate', '5'],
      ],
    },
  ],
};

/* A second counter for the advertiser side, so the two landing pages are not
   looking at the same shop. Buns and bowls rather than brunch. */
export const NORTH_PARK_NOODLE: Shop = {
  sign: 'North Park Noodle',
  wall: 'slats',
  menus: [
    {
      heading: 'Bowls',
      items: [
        ['Pork shoyu', '14'],
        ['Garlic miso', '13'],
        ['Spicy tan tan', '15'],
        ['Veggie shio', '12'],
      ],
    },
    {
      heading: 'Buns + sides',
      items: [
        ['Pork bun', '5'],
        ['Chicken bun', '5'],
        ['Pork gyoza', '7'],
        ['Smashed cucumber', '4'],
      ],
    },
  ],
};

/* The hero scene: a neighborhood shop counter with three boards hung above it.
   Two are the shop's own chalk menus; the third is the rotating local ad, so
   the split the whole product is about is visible at a glance. */
export function ShopScene({
  ads,
  activeAd,
  onSelectAd,
  shop = SUNNY_SPOON,
}: {
  ads: Ad[];
  activeAd: number;
  onSelectAd: (index: number) => void;
  shop?: Shop;
}) {
  const current = ads[activeAd];
  return (
    <div className="shop">
      <p className="visually-hidden">
        An illustrated {shop.sign} counter with three boards above it. Two hold the
        shop&rsquo;s own menu; the third is showing a local ad for {current.brand}.
      </p>
      <div className="shop-scene" aria-hidden="true">
        <div className={`wall ${shop.wall}`}>
          <span className="lamp one" />
          <span className="lamp two" />

          <div className="boards">
            {shop.menus.map((menu) => (
              <div className="board menu" key={menu.heading}>
                <b>{menu.heading}</b>
                {menu.items.map(([item, price]) => (
                  <p key={item}>
                    {item} <i>{price}</i>
                  </p>
                ))}
              </div>
            ))}
            <div className={`board ad ${current.color}`} key={activeAd}>
              <strong>{current.brand}</strong>
              <p>{current.detail}</p>
            </div>
          </div>

          <div className="shop-sign">{shop.sign}</div>

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
