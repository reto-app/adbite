'use client';

import { useCopy } from '@/lib/lang';
import { HOME } from '@/lib/copy/home';
import { GymSpot } from './gym-spot';

/* The four formats, each preview running the thing it describes on a board
   detailed enough to be a real one: the café's own menu underneath, its name
   on it, and the ad taking only the share it is sold.
   
   Order matches the rate card everywhere else on the site — cheapest first,
   dearest last — so a reader moving between this and the pricing grid is not
   re-learning the order. */

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
        <div className="format-preview rail" aria-hidden="true">
          <Menu trim />
          <div className="fp-rail">
            {/* Short lines: the rail is a third of a board, and on a preview
                this size that is about a hundred pixels to set copy in. */}
            <b className="one">
              <i className="fp-mark">9S</i>
              <span>{t.books.name}</span>
              <strong>{t.books.short}</strong>
              <small>{t.books.sub}</small>
            </b>
            <b className="two">
              <i className="fp-mark">RB</i>
              <span>{t.barbers.name}</span>
              <strong>{t.barbers.short}</strong>
              <small>{t.barbers.sub}</small>
            </b>
            <b className="three">
              <i className="fp-mark">IR</i>
              <span>{t.gym.name}</span>
              <strong>{t.gym.short}</strong>
              <small>{t.gym.sub}</small>
            </b>
            <span className="fp-dots rail">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
        <h3>{t.rail.title}</h3>
        <p>{t.rail.text}</p>
      </article>

      <article>
        <div className="format-preview full" aria-hidden="true">
          <Menu detail />
          <div className="fp-takeover">
            <span className="fp-kicker">{t.cycles.kicker}</span>
            <div className="fp-brandline">
              <i className="fp-mark">FC</i>{t.cycles.name}
            </div>
            <b>{t.cycles.line}</b>
            <small>{t.cycles.sub}</small>
            <em className="fp-return">{t.cycles.back}</em>
          </div>
        </div>
        <h3>{t.full.title}</h3>
        <p>{t.full.text}</p>
      </article>

      <article>
        <div className="format-preview video" aria-hidden="true">
          <Menu />
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
