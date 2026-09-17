'use client';

import { useCopy } from '@/lib/lang';
import { HOME } from '@/lib/copy/home';
import { GymSpot } from './gym-spot';
import { FoodScene } from './food-scene';

/* The two formats AdBite sells, each preview running the thing it describes
   rather than describing it.

   The banner sits under the café's own menu, so that card draws a menu. The
   short video interrupts the shop's own footage, not its price list, so that
   card draws food. Cheapest first, the way the rate card reads. */

/* The shop's own board, under whatever the ad is doing to it. `detail` carries
   the item descriptions, which only fit when the ad is not taking width;
   `trim` drops the pastry block, which is what overflows once the banner has
   taken the bottom of the board. */
function Menu({ detail = false, trim = false }: { detail?: boolean; trim?: boolean }) {
  return (
    <div className="fp-board">
      <header>
        <b>SUNNY SPOON</b>
        <i>Open till 3</i>
      </header>
      <div className="fp-cols">
        <div>
          <strong>Coffee</strong>
          <p>
            <span>
              Cold brew
              {detail && <em>Slow steeped, eighteen hours</em>}
            </span>
            <i>5.00</i>
          </p>
          <p>
            <span>
              Cortado
              {detail && <em>Double shot, whole milk</em>}
            </span>
            <i>4.25</i>
          </p>
          <p>
            <span>
              Oat latte
              {detail && <em>Hot or iced</em>}
            </span>
            <i>5.50</i>
          </p>
          <p>
            <span>
              Drip
              {detail && <em>Rotating single origin</em>}
            </span>
            <i>3.25</i>
          </p>
        </div>
        <div>
          <strong>Kitchen</strong>
          <p>
            <span>Avocado toast</span>
            <i>12.00</i>
          </p>
          <p>
            <span>Egg + cheddar</span>
            <i>8.00</i>
          </p>
          {!trim && (
            <>
              <strong>Pastry</strong>
              <p>
                <span>Morning bun</span>
                <i>4.50</i>
              </p>
              <p>
                <span>Croissant</span>
                <i>4.00</i>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function FormatGrid() {
  const t = useCopy(HOME).formats;
  return (
    <div className="format-grid">
      <article>
        <div className="format-preview banner" aria-hidden="true">
          <Menu trim />
          <div className="fp-strip">
            <b className="one">
              <i className="fp-mark">9S</i>
              <span>
                {t.books.name}<em>{t.books.line}</em>
              </span>
            </b>
            <b className="two">
              <i className="fp-mark">RB</i>
              <span>
                {t.barbers.name}<em>{t.barbers.line}</em>
              </span>
            </b>
            <b className="three">
              <i className="fp-mark">IR</i>
              <span>
                {t.gym.name}<em>{t.gym.line}</em>
              </span>
            </b>
            <span className="fp-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
        <h3>{t.banner.title}</h3>
        <p>{t.banner.text}</p>
      </article>

      <article>
        <div className="format-preview video" aria-hidden="true">
          <FoodScene />
          <div className="fp-screen">
            <GymSpot />
            <div className="fp-chrome">
              <span className="fp-timer">
                <span className="fp-clock">
                  <i className="one">0:15</i>
                  <i className="two">0:09</i>
                  <i className="three">0:04</i>
                </span>
              </span>
              <span className="fp-badge">{t.videoFrames.muted}</span>
            </div>
            <div className="fp-lower" />
            <div className="fp-frame one">
              <b>{t.videoFrames.one[0]}</b>
              <small>{t.videoFrames.one[1]}</small>
            </div>
            <div className="fp-frame two">
              <b>{t.videoFrames.two[0]}</b>
              <small>{t.videoFrames.two[1]}</small>
            </div>
            <div className="fp-frame three">
              <b>{t.videoFrames.three[0]}</b>
              <small>{t.videoFrames.three[1]}</small>
            </div>
            <span className="fp-bug">IR</span>
            <i className="fp-bar" />
          </div>
        </div>
        <h3>{t.video.title}</h3>
        <p>{t.video.text}</p>
      </article>
    </div>
  );
}
