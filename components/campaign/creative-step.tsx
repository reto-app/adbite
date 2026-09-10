'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { BOARDS, FORMATS, type FormatId } from '@/lib/boards';

const MAX_BYTES = 6 * 1024 * 1024;

export function CreativeStep({
  format,
  onFormat,
  creative,
  onCreative,
}: {
  format: FormatId;
  onFormat: (format: FormatId) => void;
  creative: { name: string; src: string } | null;
  onCreative: (creative: { name: string; src: string } | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image. Upload a PNG or JPG of your ad.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is over 6 MB. Export it a little smaller and try again.');
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

  return (
    <div className="creative-step">
      <section className="format-picker">
        <div className="prefs-head">
          <h3>Pick a format</h3>
          <span className="prefs-hint">Four ways an ad shows up on a shop’s board.</span>
        </div>
        <div className="format-cards">
          {FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`format-card${format === item.id ? ' on' : ''}`}
              aria-pressed={format === item.id}
              onClick={() => onFormat(item.id)}
            >
              <span className="format-mock" aria-hidden="true">
                <i className="mock-line" />
                <i className="mock-line" />
                <i className="mock-line short" />
                <span className="mock-slot" style={item.diagram}>
                  {item.id === 'video' && <em>▶</em>}
                </span>
              </span>
              <b>{item.name}</b>
              <span className="format-blurb">{item.blurb}</span>
              <small>{item.spec}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="upload">
        <div className="prefs-head">
          <h3>Upload your ad</h3>
          <span className="prefs-hint">
            {FORMATS.find((item) => item.id === format)?.spec}
          </span>
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
              <img src={creative.src} alt="Your uploaded ad creative" />
              <div>
                <b>{creative.name}</b>
                <span>Placed in every preview below.</span>
                <div className="dropzone-actions">
                  <button type="button" onClick={() => input.current?.click()}>
                    <Upload size={14} /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreative(null);
                      if (input.current) input.current.value = '';
                    }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" className="dropzone-empty" onClick={() => input.current?.click()}>
              <ImageIcon size={26} />
              <b>Drop your artwork here</b>
              <span>or choose a file · PNG or JPG, up to 6 MB</span>
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
          <h3>On the screens we run</h3>
          <span className="prefs-hint">
            {playable.length} of {BOARDS.length} board types carry this format.
          </span>
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
                  <img src={`/boards/${board.id}.jpg`} alt={`${board.name} board`} />
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
                        <span>Your ad here</span>
                      )}
                    </div>
                  )}
                </div>
                <figcaption>
                  <b>{board.name}</b>
                  <span>{slot ? board.screen : 'Doesn’t carry this format'}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>
    </div>
  );
}
