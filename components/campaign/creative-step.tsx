'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { BOARDS, type FormatId } from '@/lib/boards';
import { useCopy } from '@/lib/lang';
import { CAMPAIGN } from '@/lib/copy/campaign';
import { SHARED } from '@/lib/copy/shared';

const MAX_BYTES = 6 * 1024 * 1024;

export function CreativeStep({
  format,
  creative,
  onCreative,
}: {
  format: FormatId;
  creative: { name: string; src: string } | null;
  onCreative: (creative: { name: string; src: string } | null) => void;
}) {
  const t = useCopy(CAMPAIGN).creative;
  const shared = useCopy(SHARED);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t.notImage);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t.tooBig);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setError('');
      onCreative({ name: file.name, src: reader.result });
    };
    reader.readAsDataURL(file);
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
            take(event.dataTransfer.files?.[0]);
          }}
        >
          {creative ? (
            <div className="dropzone-filled">
              <img src={creative.src} alt={t.uploadedAlt} />
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
            accept="image/*"
            className="visually-hidden"
            onChange={(event) => take(event.target.files?.[0])}
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
