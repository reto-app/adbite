'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useCopy } from '@/lib/lang';
import { SHARED } from '@/lib/copy/shared';

/* The four example boards. Their notes are in lib/copy/shared.ts under
   `reel`, keyed by these ids. */
const boards = [
  { id: 'rosas', name: 'Rosas Taqueria' },
  { id: 'roost', name: 'The Roost Shop' },
  { id: 'forno', name: 'Forno Nove' },
  { id: 'meridian', name: 'Meridian Café', portrait: true },
] as const;

type Board = (typeof boards)[number];
type BoardId = Board['id'];

/* Four boards you can open.
 *
 * The tile is a button, so a whole board opens with a click, Enter or Space
 * and takes one stop in the tab order; the magnify badge is decoration on top
 * of it rather than a second control. The opened board is a real <dialog>
 * shown with showModal(), which brings Escape, the focus trap and the
 * inert page behind it without any of that being written here. */
export function BoardReel({ only }: { only?: string[] } = {}) {
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<Board | null>(null);

  /* Order matters. The dialog has to leave the top layer before the tile can
     take focus, because a modal refuses focus to anything outside itself, and
     unmounting it is a React commit that has not happened yet at this point.
     So: close, hand focus back to the tile that opened it, then clear state.
     Without the focus step a keyboard user is dropped at the top of the page. */
  const close = () => {
    dialog.current?.close();
    opener.current?.focus();
    opener.current = null;
    setOpen(null);
  };
  const t = useCopy(SHARED).reel;
  const noteOf = (id: BoardId) => t[id];
  const shown = only ? boards.filter((board) => only.includes(board.id)) : boards;

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

  useEffect(() => {
    const node = dialog.current;
    if (!node || !open) return;
    node.showModal();

    /* React state is the one source of truth here, and the dialog follows it:
       every way out sets `open` to null and this effect's cleanup does the
       closing. Hanging the state change off the element's own `close` event
       is the tidier-looking version and it does not work — that event never
       arrives in some browsers, which left the page locked from scrolling
       behind a dialog that had already gone. Escape is caught here for the
       same reason, because it would otherwise close the dialog natively and
       tell nobody. */
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    /* On the document, not the dialog: showModal() does not reliably leave
       focus inside the dialog, and a keydown on the body never bubbles to an
       element that is not its ancestor. */
    document.addEventListener('keydown', onKey);

    /* showModal makes the page inert but does not stop it scrolling. */
    const held = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = held;
      if (node.open) node.close();
    };
  }, [open]);

  return (
    <>
      <div className="reel">
        {shown.map((board, i) => (
          <figure className="reel-item" key={board.id}>
            <button
              type="button"
              className="reel-screen"
              data-track={`board-expand-${board.id}`}
              aria-label={t.expand(board.name)}
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpen(board);
              }}
            >
              <video
                ref={(el) => {
                  videos.current[i] = el;
                }}
                className={'portrait' in board && board.portrait ? 'contain' : undefined}
                src={`/boards/${board.id}.mp4`}
                poster={`/boards/${board.id}.jpg`}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
              />
              <span className="reel-zoom" aria-hidden="true">
                <Maximize2 size={15} />
              </span>
            </button>
            <figcaption>
              <b>{board.name}</b>
              <span>{noteOf(board.id)}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {open && (
        // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <dialog
          ref={dialog}
          className="reel-open"
          aria-label={t.boardOf(open.name)}
          /* The backdrop is the dialog box itself, so dismiss-on-click has
             nowhere else to live, and the lint rule above is written for
             elements with no keyboard path. This one has two: Escape and the
             close button. A click inside the panel never reaches here. */
          onClick={(event) => {
            if (event.target === dialog.current) close();
          }}
        >
          <figure className={`reel-open-panel${'portrait' in open && open.portrait ? ' portrait' : ''}`}>
            <video
              className={'portrait' in open && open.portrait ? 'contain' : undefined}
              src={`/boards/${open.id}.mp4`}
              poster={`/boards/${open.id}.jpg`}
              muted
              loop
              autoPlay
              playsInline
              aria-hidden="true"
            />
            <figcaption>
              <b>{open.name}</b>
              <span>{noteOf(open.id)}</span>
            </figcaption>
          </figure>
          <button type="button" className="reel-close" onClick={close}>
            <X size={17} /> {t.close}
          </button>
        </dialog>
      )}
    </>
  );
}
