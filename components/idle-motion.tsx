'use client';

import { useEffect } from 'react';

/* Stop animating what nobody is looking at.
 *
 * The stylesheet declares twenty infinite animations across the format
 * previews, the venue scenes and the map, none of which were gated on
 * visibility: a phone kept compositing all of them while its owner read an
 * entirely different section. The board reel already did this correctly with
 * an IntersectionObserver, so this applies the same idea to everything else.
 *
 * It marks sections rather than individual elements, and the CSS pauses their
 * subtree, so no component needs to know it is being watched. */

const WATCH = '.formats, .venues, .network, .approval, .hero-band, .flow-section, .boards-section';

export function IdleMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>(WATCH));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('off-screen', !entry.isIntersecting);
        }
      },
      /* A little margin so a section is already running by the time it
         arrives rather than starting mid-scroll. */
      { rootMargin: '120px 0px' },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return null;
}
