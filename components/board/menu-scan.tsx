'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, ScanLine, X } from 'lucide-react';
import { emptySection, newId, type Badge, type MenuSection } from '@/lib/board';
import { supabase } from '@/lib/supabase';
import { useCopy } from '@/lib/lang';
import { SHOP } from '@/lib/copy/shop';

/* The menu that is already on the wall.
 *
 * Point a phone at the printed menu, the chalkboard or the laminated card,
 * and what comes back is sections and prices ready to be corrected. Typing a
 * menu in is the slowest thing about setting a board up and it is the thing
 * standing between a shop owner and seeing their own board on a screen.
 *
 * Nothing lands on the board unread. The result is shown as a list with the
 * counts in plain words, and the shop chooses between adding it to what is
 * there and replacing it. An extraction that is nine-tenths right and
 * reviewed is worth more than one that is perfect and trusted, because the
 * tenth is a wrong price on a wall.
 *
 * The photograph is downscaled here and never stored: it is sent, read and
 * dropped. 1600px on the long edge is comfortably enough to read a menu and
 * roughly a tenth of what a modern phone camera hands over.
 */

type Scanned = { title: string; items: { name: string; note: string; price: string }[] };

const LONG_EDGE = 1600;

async function shrink(file: File): Promise<{ data: string; mediaType: string }> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('unreadable'));
      element.src = url;
    });
    const scale = Math.min(1, LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('unreadable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    /* JPEG at 0.85: a menu is text on a flat ground, where the difference
       between this and lossless is invisible and about eight times the bytes
       over a shop's wifi. */
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MenuScan({
  onAdd,
  onName,
}: {
  /** Sections to add to this board, or to replace it with. */
  onAdd: (sections: MenuSection[], replace: boolean) => void;
  /** The shop's name and line, if the menu happened to carry them. */
  onName: (name: string, tagline: string) => void;
}) {
  const t = useCopy(SHOP).scan;
  const camera = useRef<HTMLInputElement | null>(null);
  const file = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ sections: Scanned[]; shopName: string; tagline: string } | null>(null);

  const read = async (picked: File | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith('image/')) {
      setError(t.notImage);
      return;
    }
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      const { data, mediaType } = await shrink(picked);
      const { data: session } = await supabase().auth.getSession();
      const jwt = session.session?.access_token;
      if (!jwt) throw new Error(t.signIn);

      const response = await fetch('/api/menu-scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ image: data, mediaType }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        sections?: Scanned[];
        shopName?: string;
        tagline?: string;
        message?: string;
      };
      if (!response.ok || !body.sections) throw new Error(body.message ?? t.failed);
      setFound({ sections: body.sections, shopName: body.shopName ?? '', tagline: body.tagline ?? '' });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  /* Fresh ids on the way out, so a menu scanned twice does not collide with
     itself and the layout's block-per-section mapping stays one to one. */
  const asSections = (sections: Scanned[]): MenuSection[] =>
    sections.map((section) => ({
      ...emptySection(),
      title: section.title,
      items: section.items.map((item) => ({
        id: newId('i'),
        name: item.name,
        note: item.note,
        price: item.price,
        badge: 'none' as Badge,
      })),
    }));

  const total = found?.sections.reduce((sum, section) => sum + section.items.length, 0) ?? 0;

  return (
    <section className="shop-panel scan-panel">
      <div className="prefs-head">
        <h3>
          <ScanLine size={15} /> {t.title}
        </h3>
        <span className="prefs-hint">{t.hint}</span>
      </div>

      <div className="scan-actions">
        <button type="button" className="button primary" disabled={busy} onClick={() => camera.current?.click()}>
          {busy ? <Loader2 size={15} className="spin" /> : <Camera size={15} />} {busy ? t.reading : t.take}
        </button>
        <button type="button" className="button ghost" disabled={busy} onClick={() => file.current?.click()}>
          {t.choose}
        </button>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            void read(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            void read(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      {error && <p className="picture-picker-error">{error}</p>}

      {found && (
        <div className="scan-result">
          <div className="scan-result-head">
            <b>{t.found(found.sections.length, total)}</b>
            <button type="button" className="icon-button" aria-label={t.discard} onClick={() => setFound(null)}>
              <X size={15} />
            </button>
          </div>

          <ul className="scan-preview">
            {found.sections.map((section) => (
              <li key={section.title}>
                <b>{section.title}</b>
                <span>{section.items.map((item) => item.name).join(' · ')}</span>
              </li>
            ))}
          </ul>

          <p className="prefs-note">{t.checkIt}</p>

          <div className="scan-choose">
            <button
              type="button"
              className="button primary"
              onClick={() => {
                onAdd(asSections(found.sections), false);
                if (found.shopName || found.tagline) onName(found.shopName, found.tagline);
                setFound(null);
              }}
            >
              {t.add}
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                onAdd(asSections(found.sections), true);
                if (found.shopName || found.tagline) onName(found.shopName, found.tagline);
                setFound(null);
              }}
            >
              {t.replace}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
