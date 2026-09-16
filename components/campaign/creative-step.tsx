'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { uploadCreative } from '@/lib/creatives';
import { BOARDS, type FormatId } from '@/lib/boards';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';

const MAX_IMAGE = 6 * 1024 * 1024;
const MAX_VIDEO = 12 * 1024 * 1024;
const MAX_SECONDS = 20;

/* What the rest of the builder holds onto: where the file now lives, and the
   row that will be attached to the booking. `src` is a real URL, not a data
   URL, because the same file is what a TV downloads. */
export type Creative = { name: string; src: string; creativeId: string; kind: 'image' | 'video' };

export function CreativeStep({
  format,
  creative,
  onCreative,
}: {
  format: FormatId;
  creative: Creative | null;
  onCreative: (creative: Creative | null) => void;
}) {
  const t = useCopy(CAMPAIGN).creative;
  const shared = useCopy(SHARED);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<number | null>(null);

  const take = async (file: File | undefined) => {
    if (!file) return;
    const isVideo = file.type === 'video/mp4';
    const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    if (!isVideo && !isImage) {
      setError(t.notImage);
      return;
    }
    if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
      setError(t.tooBig);
      return;
    }

    /* Uploaded now rather than at booking: the advertiser finds out here,
       while they are still looking at the file, if it will not go. */
    setError('');
    setProgress(0.05);
    const result = await uploadCreative(file, setProgress);
    setProgress(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (isVideo && result.creative.seconds !== null && result.creative.seconds > MAX_SECONDS) {
      setError(t.tooLong);
      return;
    }
    onCreative({
      name: result.creative.name,
      src: result.creative.url,
      creativeId: result.creative.creativeId,
      kind: result.creative.kind,
    });
  };

  const playable = BOARDS.filter((board) => board.slots[format]);
  const chosenFormat = shared.formats[format];

  return (
    <div className="creative-step">
      <section className="format-recap">
        <div className="prefs-head">
          <h3>{chosenFormat.name}</h3>
          <span className="prefs-hint">{chosenFormat.spec}</span>
        </div>
        <p>{chosenFormat.blurb}{t.changeBack}</p>
      </section>

      <section className="upload">
        <div className="prefs-head">
          <h3>{t.upload}</h3>
          <span className="prefs-hint">{chosenFormat.spec}</span>
        </div>
        <div
          className={`dropzone${dragging ? ' dragging' : ''}${creative ? ' filled' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void take(event.dataTransfer.files?.[0]);
          }}
        >
          {progress !== null ? (
            <div className="dropzone-empty" aria-live="polite">
              <Upload size={26} />
              <b>{t.uploading}</b>
              <span className="upload-bar">
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
            </div>
          ) : creative ? (
            <div className="dropzone-filled">
              {creative.kind === 'video' ? (
                <video src={creative.src} muted loop autoPlay playsInline />
              ) : (
                <img src={creative.src} alt={t.uploadedAlt} />
              )}
              <div>
                <b>{creative.name}</b>
                <span>{t.placed}</span>
                <div className="dropzone-actions">
                  <button type="button" onClick={() => input.current?.click()}>
                    <Upload size={14} /> {t.replace}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreative(null);
                      if (input.current) input.current.value = '';
                    }}
                  >
                    <Trash2 size={14} /> {t.remove}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" className="dropzone-empty" onClick={() => input.current?.click()}>
              <ImageIcon size={26} />
              <b>{t.drop}</b>
              <span>{t.dropSub}</span>
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4"
            className="visually-hidden"
            onChange={(event) => void take(event.target.files?.[0])}
          />
        </div>
        {error && (
          <p className="prefs-warn" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="previews">
        <div className="prefs-head">
          <h3>{t.previews}</h3>
          <span className="prefs-hint">{t.previewsHint(playable.length, BOARDS.length)}</span>
        </div>
        <div className="preview-grid">
          {BOARDS.map((board) => {
            const slot = board.slots[format];
            return (
              <figure
                key={board.id}
                className={`preview${board.portrait ? ' portrait' : ''}${slot ? '' : ' off'}`}
              >
                <div className="preview-screen">
                  <img src={`/boards/${board.id}.jpg`} alt={t.boardAlt(board.name)} />
                  {slot && (
                    <div
                      className="preview-slot"
                      style={{
                        left: `${slot.left}%`,
                        top: `${slot.top}%`,
                        width: `${slot.width}%`,
                        height: `${slot.height}%`,
                      }}
                    >
                      {creative ? (
                        <img src={creative.src} alt="" />
                      ) : (
                        <span>{t.yourAdHere}</span>
                      )}
                    </div>
                  )}
                </div>
                <figcaption>
                  <b>{board.name}</b>
                  <span>{slot ? board.screen : t.noFormat}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>
    </div>
  );
}
