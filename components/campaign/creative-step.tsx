'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { uploadCreative } from '@/lib/creatives';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';

const MAX_IMAGE = 6 * 1024 * 1024;
const MAX_VIDEO = 12 * 1024 * 1024;
const MAX_SECONDS = 20;

/* What the rest of the builder holds onto: where the file now lives, and the
   row that will be attached to the booking. `src` is a real URL, not a data
   URL, because the same file is what a TV downloads. */
export type Creative = { name: string; src: string; creativeId: string; kind: 'image' | 'video' };

/* The file-taking half on its own, because there are two places that need it
   and they want different things around it. The old builder took one file for
   the whole campaign and showed it on stock boards; the new one takes a file
   per shop and shows it on that shop's real board. Both take the file the
   same way, and neither should own a second copy of the size limits. */
export function CreativeDrop({
  creative,
  onCreative,
}: {
  creative: Creative | null;
  onCreative: (creative: Creative | null) => void;
}) {
  const t = useCopy(CAMPAIGN).creative;
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

  return (
    <>
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
    </>
  );
}
