'use client';

/* The shop's TVs.
 *
 * A screen registers itself the first time the channel runs and shows a
 * six-character code. The owner types it here, the row becomes theirs, and
 * from then on the TV polls for their board every ten minutes. What this
 * store shows is what the TV last told the server: when it last checked in
 * and which channel build it runs. */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Device = {
  id: string;
  name: string;
  screen: 'menu' | 'reel';
  lastSeen: number | null;
  channelVersion: string | null;
  createdAt: number;
};

/** Minutes between polls, mirrored from api/device/sync. The copy that tells
    the owner how long a change takes reads from here. */
export const POLL_MINUTES = 10;

/** A TV that has checked in inside two polls is on the wall and listening. */
export function isOnline(device: Device, now = Date.now()) {
  return device.lastSeen !== null && now - device.lastSeen < 2 * POLL_MINUTES * 60 * 1000;
}

type Cache = { ready: boolean; devices: Device[] };
let cache: Cache = { ready: false, devices: [] };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

async function load() {
  const { data } = await supabase()
    .from('devices')
    .select('id, name, screen, last_seen, channel_version, created_at')
    .order('created_at');
  cache = {
    ready: true,
    devices: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? 'TV',
      screen: row.screen,
      lastSeen: row.last_seen ? Date.parse(row.last_seen) : null,
      channelVersion: row.channel_version,
      createdAt: Date.parse(row.created_at),
    })),
  };
  announce();
}

export function reloadDevices() {
  loading = load();
}

async function token() {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function pairDevice(code: string, name?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const jwt = await token();
  if (!jwt) return { ok: false, message: 'Sign in first.' };
  const response = await fetch('/api/device/pair', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ code, name }),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) return { ok: false, message: body.message ?? 'Could not pair that TV.' };
  reloadDevices();
  return { ok: true };
}

export async function renameDevice(id: string, name: string) {
  await supabase().from('devices').update({ name }).eq('id', id);
  reloadDevices();
}

export async function setDeviceScreen(id: string, screen: Device['screen']) {
  await supabase().from('devices').update({ screen }).eq('id', id);
  reloadDevices();
}

export function useDevices(): Cache {
  const [state, setState] = useState<Cache>({ ready: false, devices: [] });
  useEffect(() => {
    if (!loading) loading = load();
    const sync = () => setState(cache);
    sync();
    listeners.add(sync);
    /* The wall changes on its own schedule; refetch so "last seen" moves. */
    const tick = setInterval(reloadDevices, 60 * 1000);
    return () => {
      listeners.delete(sync);
      clearInterval(tick);
    };
  }, []);
  return state;
}
