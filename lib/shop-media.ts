'use client';

/* The shop's own pictures and film.
 *
 * This is the half of the screen a shop owns outright: never approved by
 * anyone, never billed to anyone, and mixed into the same rotation as the
 * advertising so a board reads as one thing. Uploads take the same road as a
 * creative — straight to storage with a signed URL, then a server check that
 * the file really arrived — and video is re-encoded by the render worker
 * before any screen sees it.
 *
 * `ready` is false while that is happening, which is why the dashboard shows
 * a piece of media as still processing rather than pretending it is live. */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ASSETS_ORIGIN } from '@/lib/creatives';

export type ShopMedia = {
  id: string;
  name: string;
  kind: 'image' | 'video';
  url: string | null;
  posterUrl: string | null;
  seconds: number | null;
  holdSeconds: number;
  ready: boolean;
  position: number;
  /** The TVs this plays on. Null is every TV the shop has, now and later. */
  deviceIds: string[] | null;
};

type Cache = { ready: boolean; media: ShopMedia[] };
let cache: Cache = { ready: false, media: [] };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

async function load() {
  const { data } = await supabase()
    .from('shop_media')
    .select('id, name, kind, storage_path, poster_path, seconds, hold_seconds, ready, position, device_ids')
    .order('position');
  cache = {
    ready: true,
    media: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      url: row.storage_path ? `${ASSETS_ORIGIN}/${row.storage_path}` : null,
      posterUrl: row.poster_path ? `${ASSETS_ORIGIN}/${row.poster_path}` : null,
      seconds: row.seconds === null ? null : Number(row.seconds),
      holdSeconds: row.hold_seconds,
      ready: row.ready,
      position: row.position,
      deviceIds: (row.device_ids as string[] | null) ?? null,
    })),
  };
  announce();
}

export function reloadShopMedia() {
  loading = load();
}

async function token() {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

export async function uploadShopMedia(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<{ ok: true; processing: boolean } | { ok: false; message: string }> {
  const jwt = await token();
  if (!jwt) return { ok: false, message: 'Sign in before adding media.' };

  const [hash, dimensions] = await Promise.all([sha256(file), probe(file)]);
  onProgress?.(0.1);

  const start = await fetch('/api/uploads?for=shop', {
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
  const started = (await start.json().catch(() => ({}))) as {
    mediaId?: string;
    uploadUrl?: string;
    uploadHeaders?: Record<string, string>;
    message?: string;
  };
  if (!start.ok || !started.uploadUrl || !started.mediaId) {
    return { ok: false, message: started.message ?? 'Could not start the upload.' };
  }
  onProgress?.(0.2);

  /* The headers the server signed. See lib/creatives.ts for why they come
     from there rather than being spelled out here. */
  const put = await fetch(started.uploadUrl, {
    method: 'PUT',
    headers: started.uploadHeaders ?? { 'content-type': file.type },
    body: file,
  });
  if (!put.ok) return { ok: false, message: 'The file did not reach storage. Check your connection and try again.' };
  onProgress?.(0.9);

  const finish = await fetch('/api/uploads?for=shop&done=1', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ mediaId: started.mediaId }),
  });
  const finished = (await finish.json().catch(() => ({}))) as { message?: string; processing?: boolean };
  if (!finish.ok) return { ok: false, message: finished.message ?? 'The upload could not be confirmed.' };
  onProgress?.(1);
  reloadShopMedia();
  return { ok: true, processing: Boolean(finished.processing) };
}

export async function removeShopMedia(id: string) {
  await supabase().from('shop_media').delete().eq('id', id);
  reloadShopMedia();
}

/** How long a still is held on screen. Video plays for its own length. */
/** Which TVs a piece plays on. Pass null to put it back on every TV. */
export async function setMediaDevices(id: string, deviceIds: string[] | null) {
  cache = {
    ...cache,
    media: cache.media.map((item) => (item.id === id ? { ...item, deviceIds } : item)),
  };
  announce();
  await supabase().from('shop_media').update({ device_ids: deviceIds }).eq('id', id);
}

export async function setHoldSeconds(id: string, seconds: number) {
  await supabase().from('shop_media').update({ hold_seconds: Math.max(2, Math.min(60, seconds)) }).eq('id', id);
  reloadShopMedia();
}

export function useShopMedia(): Cache {
  const [state, setState] = useState<Cache>({ ready: false, media: [] });
  useEffect(() => {
    if (!loading) loading = load();
    const sync = () => setState(cache);
    sync();
    listeners.add(sync);
    /* Video is re-encoded after it lands, so a piece of media that is still
       processing becomes ready without anyone reloading the page. */
    const tick = setInterval(() => {
      if (cache.media.some((item) => !item.ready)) reloadShopMedia();
    }, 15 * 1000);
    return () => {
      listeners.delete(sync);
      clearInterval(tick);
    };
  }, []);
  return state;
}
