import { GymSpot } from './gym-spot';

/* The three formats, each preview running the thing it describes on a board
   detailed enough to be a real one: the café's own menu underneath, its name
   on it, and the ad taking only the share it is sold. */
export function FormatGrid() {
  return (
    <div className="format-grid">
      <article>
        <div className="format-preview full" aria-hidden="true">
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
                    Cold brew<em>Slow steeped, eighteen hours</em>
                  </span>
                  <i>5.00</i>
                </p>
                <p>
                  <span>
                    Cortado<em>Double shot, whole milk</em>
                  </span>
                  <i>4.25</i>
                </p>
                <p>
                  <span>
                    Oat latte<em>Hot or iced</em>
                  </span>
                  <i>5.50</i>
                </p>
                <p>
                  <span>
                    Drip<em>Rotating single origin</em>
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
                <strong>Pastry</strong>
                <p>
                  <span>Morning bun</span>
                  <i>4.50</i>
                </p>
                <p>
                  <span>Croissant</span>
                  <i>4.00</i>
                </p>
              </div>
            </div>
            <div className="fp-foot">Beans roasted on Tuesdays · refills on drip</div>
          </div>
          <div className="fp-takeover">
            <span className="fp-kicker">Local spot</span>
            <div className="fp-brandline">
              <i className="fp-mark">FC</i>Freedom Cycles
            </div>
            <b>Free tune-up with any repair</b>
            <small>820 N Freedom Blvd · two blocks north</small>
            <em className="fp-return">Your menu is back in 0:04</em>
          </div>
        </div>
        <h3>Full-screen spot</h3>
        <p>Your board blanks for one turn of the rotation, then it is back.</p>
      </article>

      <article>
        <div className="format-preview video" aria-hidden="true">
          <div className="fp-board">
            <header>
              <b>SUNNY SPOON</b>
              <i>Open till 3</i>
            </header>
            <div className="fp-cols">
              <div>
                <strong>Coffee</strong>
                <p>
                  <span>Cold brew</span>
                  <i>5.00</i>
                </p>
                <p>
                  <span>Cortado</span>
                  <i>4.25</i>
                </p>
                <p>
                  <span>Oat latte</span>
                  <i>5.50</i>
                </p>
                <p>
                  <span>Drip</span>
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
                <strong>Pastry</strong>
                <p>
                  <span>Morning bun</span>
                  <i>4.50</i>
                </p>
                <p>
                  <span>Croissant</span>
                  <i>4.00</i>
                </p>
              </div>
            </div>
            <div className="fp-foot">Beans roasted on Tuesdays · refills on drip</div>
          </div>
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
              <span className="fp-badge">Muted</span>
            </div>
            <div className="fp-lower" />
            <div className="fp-frame one">
              <b>Iron Rose Gym</b>
              <small>The strength room on your block</small>
            </div>
            <div className="fp-frame two">
              <b>First class free</b>
              <small>Weekday mornings, no sign-up</small>
            </div>
            <div className="fp-frame three">
              <b>Two doors down</b>
              <small>214 N 400 W · open 5am to 10pm</small>
            </div>
            <span className="fp-bug">IR</span>
            <i className="fp-bar" />
          </div>
        </div>
        <h3>Short video</h3>
        <p>Fifteen muted seconds on a blank board, then your menu is back. No sound to talk over.</p>
      </article>

      <article>
        <div className="format-preview banner" aria-hidden="true">
          <div className="fp-board">
            <header>
              <b>SUNNY SPOON</b>
              <i>Open till 3</i>
            </header>
            <div className="fp-cols">
              <div>
                <strong>Coffee</strong>
                <p>
                  <span>Cold brew</span>
                  <i>5.00</i>
                </p>
                <p>
                  <span>Cortado</span>
                  <i>4.25</i>
                </p>
                <p>
                  <span>Oat latte</span>
                  <i>5.50</i>
                </p>
                <p>
                  <span>Drip</span>
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
                <strong>Pastry</strong>
                <p>
                  <span>Morning bun</span>
                  <i>4.50</i>
                </p>
              </div>
            </div>
          </div>
          <div className="fp-strip">
            <b className="one">
              <i className="fp-mark">9S</i>
              <span>
                Ninth Street Books<em>10% off with your receipt</em>
              </span>
            </b>
            <b className="two">
              <i className="fp-mark">RB</i>
              <span>
                Rosewood Barbers<em>Walk-ins till seven</em>
              </span>
            </b>
            <b className="three">
              <i className="fp-mark">IR</i>
              <span>
                Iron Rose Gym<em>First class free</em>
              </span>
            </b>
            <span className="fp-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
        <h3>Bottom banner</h3>
        <p>Your menu stays put. The strip below rotates between advertisers.</p>
      </article>
    </div>
  );
}
