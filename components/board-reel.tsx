'use client';

import { useEffect, useRef } from 'react';

const boards = [
  {
    id: 'rosas',
    name: 'Rosas Taqueria',
    note: 'The ad runs as a strip along the bottom. The whole menu stays above it.',
  },
  {
    id: 'roost',
    name: 'The Roost Shop',
    note: 'Ads take the right third of the board. Chicken mains and sides keep the rest.',
  },
  {
    id: 'forno',
    name: 'Forno Nove',
    note: 'Two screens on one wall. Only the right one breaks for a short local spot.',
  },
  {
    id: 'meridian',
    name: 'Meridian Café',
    note: 'A tall board behind the counter, with the ad slot at the foot.',
    portrait: true,
  },
];

export function BoardReel() {
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Only the boards actually on screen are worth decoding.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.25 },
    );

    for (const video of videos.current) {
      if (video) observer.observe(video);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="reel">
      {boards.map((board, i) => (
        <figure className="reel-item" key={board.id}>
          <div className="reel-screen">
            <video
              ref={(el) => {
                videos.current[i] = el;
              }}
              className={board.portrait ? 'contain' : undefined}
              src={`/boards/${board.id}.mp4`}
              poster={`/boards/${board.id}.jpg`}
              muted
              loop
              playsInline
              preload="none"
              aria-label={`${board.name} board`}
            />
          </div>
          <figcaption>
            <b>{board.name}</b>
            <span>{board.note}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
