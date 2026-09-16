'use client';

/* Getting a piece of artwork from a laptop to a wall.
 *
 * The file goes straight from the browser to storage with a signed URL; the
 * server only ever handles the note about it. The hash is computed here
 * because it is also the name the TV gives its local copy, so the same file
 * is never downloaded twice.
 *
 * Every failure comes back as a sentence somebody can act on: an upload that
 * half-worked is worse than one that plainly did not. */

import { supabase } from '@/lib/supabase';

export const ASSETS_ORIGIN = 'https://assets.adbite.site';

export type Uploaded = {
  creativeId: string;
  /** Where it can be seen now: the public URL, good for a preview. */
  url: string;
  name: string;
  kind: 'image' | 'video';
  bytes: number;
  seconds: number | null;
};

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Duration and frame size, read from the file itself rather than trusted. */
function probe(file: File): Promise<{ seconds: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (result: { seconds: number | null; width: number | null; height: number | null }) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () =>
        done({ seconds: Math.round(video.duration * 10) / 10, width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => done({ seconds: null, width: null, height: null });
      video.src = url;
      return;
    }
    const image = new Image();
    image.onload = () => done({ seconds: null, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => done({ seconds: null, width: null, height: null });
    image.src = url;
  });
}

async function token() {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function uploadCreative(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<{ ok: true; creative: Uploaded } | { ok: false; message: string }> {
  const jwt = await token();
  if (!jwt) return { ok: false, message: 'Sign in before uploading artwork.' };

  const [hash, dimensions] = await Promise.all([sha256(file), probe(file)]);
  onProgress?.(0.1);

  const start = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      name: file.name,
      contentType: file.type,
      bytes: file.size,
      sha256: hash,
      seconds: dimensions.seconds,
      width: dimensions.width,
      height: dimensions.height,
    }),
  });
  const started = (await start.json().catch(() => ({}))) as { creativeId?: string; uploadUrl?: string; key?: string; message?: string };
  if (!start.ok || !started.uploadUrl || !started.creativeId) {
    return { ok: false, message: started.message ?? 'Could not start the upload.' };
  }
  onProgress?.(0.2);

  const put = await fetch(started.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!put.ok) return { ok: false, message: 'The file did not reach storage. Check your connection and try again.' };
  onProgress?.(0.9);

  const finish = await fetch('/api/uploads?done=1', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ creativeId: started.creativeId }),
  });
  const finished = (await finish.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!finish.ok || !finished.url) return { ok: false, message: finished.message ?? 'The upload could not be confirmed.' };
  onProgress?.(1);

  return {
    ok: true,
    creative: {
      creativeId: started.creativeId,
      url: finished.url,
      name: file.name,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      bytes: file.size,
      seconds: dimensions.seconds,
    },
  };
}
