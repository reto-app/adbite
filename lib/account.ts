'use client';

/* Which side of the board you are on.
 *
 * There is no server and no login in the pilot, so this is not authentication
 * and does not pretend to be: it is a preference, kept in this browser, that
 * decides which workspace /dashboard opens. An advertiser gets the campaign
 * builder and its reporting; a shop owner gets their board and what it earns.
 *
 * It is switchable at any time and deliberately so. Both halves of AdBite are
 * worth looking at before you commit to either, and a pilot that hides one of
 * them behind a sign-up nobody can complete is the thing this replaced. */

import { useEffect, useState } from 'react';

export type AccountKind = 'advertiser' | 'shop';

const KEY = 'adbite.account';

export const ACCOUNTS: {
  id: AccountKind;
  label: string;
  blurb: string;
  action: string;
}[] = [
  {
    id: 'advertiser',
    label: 'I want to advertise',
    blurb:
      'Buy minutes on the boards near your customers. Price a week, drop in your artwork, and see what it did once it ran.',
    action: 'Open the campaign builder',
  },
  {
    id: 'shop',
    label: 'I run a shop',
    blurb:
      'Design the board your customers read, decide where on it ads may sit, approve every one of them, and see what the screen pays you.',
    action: 'Open your board',
  },
];

const listeners = new Set<() => void>();

function read(): AccountKind | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === 'advertiser' || raw === 'shop' ? raw : null;
  } catch {
    return null;
  }
}

function announce() {
  for (const listener of listeners) listener();
}

export function setAccount(kind: AccountKind) {
  try {
    window.localStorage.setItem(KEY, kind);
  } catch {
    /* storage is unavailable; the choice lives for this page view only */
  }
  announce();
}

export function clearAccount() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  announce();
}

/** `ready` stays false through the first paint so the prerender matches. */
export function useAccount(): { ready: boolean; kind: AccountKind | null } {
  const [state, setState] = useState<{ ready: boolean; kind: AccountKind | null }>({
    ready: false,
    kind: null,
  });

  useEffect(() => {
    const sync = () => setState({ ready: true, kind: read() });
    sync();
    listeners.add(sync);
    window.addEventListener('storage', sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return state;
}
