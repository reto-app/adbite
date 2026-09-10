import { Bite } from './brand';

/* Decoration for the blue bands. The bite shape has two straight edges where
   the logo frame cut it, so every one of these is anchored into a corner with
   those edges running off the band. The dots are the bite's own lobes. */
export function SkyShapes() {
  return (
    <div className="sky-shapes" aria-hidden="true">
      <Bite className="sky-bite top-left" />
      <Bite className="sky-bite bottom-left" />
      <Bite className="sky-bite bottom-right" />
      <span className="sky-dot one" />
      <span className="sky-dot two" />
      <span className="sky-dot three" />
      <span className="sky-dot four" />
    </div>
  );
}
