'use client';

import { useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Loader2, X } from 'lucide-react';
import { uploadShopMedia, useShopMedia } from '@/lib/shop-media';
import { useCopy } from '@/lib/lang';
import { SHOP } from '@/lib/copy/shop';

/* Choosing a picture for the board.
 *
 * Everything goes through the shop's own media library, which already uploads
 * to storage, verifies the file landed and hands back a public URL. Nothing
 * here keeps a data URL: a board row is read by every TV on every poll, and a
 * photograph inside one would be re-downloaded by all of them forever.
 *
 * Two ways in, because they are two different moments: a shop that has been
 * using the board for a while picks from what it has already uploaded, and a
 * shop standing in its own kitchen takes the photo now. `capture` on the file
 * input is what opens the camera straight away on a phone; on a laptop the
 * attribute is ignored and it is an ordinary file picker.
 */

export function PicturePicker({
  value,
  onPick,
  onClose,
  /** Offered when a picture is already set. */
  allowClear = true,
}: {
  value: string | null;
  onPick: (src: string | null) => void;
  onClose: () => void;
  allowClear?: boolean;
}) {
  const t = useCopy(SHOP).pictures;
  const { ready, media } = useShopMedia();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement | null>(null);
  const camera = useRef<HTMLInputElement | null>(null);

  const images = media.filter((item) => item.kind === 'image' && item.ready && item.url);

  const take = async (picked: File | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith('image/')) {
      setError(t.notImage);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await uploadShopMedia(picked);
    setBusy(false);
    if (!result.ok) setError(result.message);
    /* The library reloads itself on a successful upload, so the new picture
       appears in the grid below and the shop taps it. Picking it for them
       would be guessing, and it is one tap either way. */
  };

  return (
    <div className="picture-picker">
      <div className="picture-picker-head">
        <b>{t.title}</b>
        <button type="button" className="icon-button" aria-label={t.close} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="picture-picker-add">
        <button type="button" className="button ghost" disabled={busy} onClick={() => camera.current?.click()}>
          {busy ? <Loader2 size={15} className="spin" /> : <Camera size={15} />} {t.takeOne}
        </button>
        <button type="button" className="button ghost" disabled={busy} onClick={() => file.current?.click()}>
          <ImagePlus size={15} /> {t.upload}
        </button>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => void take(event.target.files?.[0])}
        />
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => void take(event.target.files?.[0])}
        />
      </div>

      {error && <p className="picture-picker-error">{error}</p>}

      {ready && images.length === 0 && !busy && <p className="picture-picker-empty">{t.empty}</p>}

      <div className="picture-grid">
        {images.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`picture-cell${value === item.url ? ' on' : ''}`}
            aria-pressed={value === item.url}
            onClick={() => {
              onPick(item.url);
              onClose();
            }}
          >
            <img src={item.url ?? ''} alt={item.name} />
            {value === item.url && (
              <span className="picture-cell-on" aria-hidden="true">
                <Check size={14} />
              </span>
            )}
          </button>
        ))}
      </div>

      {allowClear && value && (
        <button
          type="button"
          className="edit-add"
          onClick={() => {
            onPick(null);
            onClose();
          }}
        >
          {t.remove}
        </button>
      )}
    </div>
  );
}
