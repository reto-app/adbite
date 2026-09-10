'use client';

/* Demo sign-in. There is no database and no server: the pilot only needs to
   show an advertiser what the signed-in side of AdBite looks like, so the
   single credential pair lives here and the session lives in localStorage. */

import { useEffect, useState } from 'react';

const KEY = 'adbite.session';

export const DEMO_CREDENTIALS = { username: 'user', password: 'pass' };

export type Session = { username: string; since: number };

const listeners = new Set<() => void>();

function read(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    return typeof parsed?.username === 'string'
      ? { username: parsed.username, since: parsed.since ?? Date.now() }
      : null;
  } catch {
    return null;
  }
}

function announce() {
  for (const listener of listeners) listener();
}

export function signIn(username: string, password: string): boolean {
  const ok =
    username.trim().toLowerCase() === DEMO_CREDENTIALS.username &&
    password === DEMO_CREDENTIALS.password;
  if (!ok) return false;
  const session: Session = { username: DEMO_CREDENTIALS.username, since: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* private mode: the session just won't outlive the tab */
  }
  announce();
  return true;
}

export function signOut() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  announce();
}

/* `ready` stays false through the first paint so the prerendered markup and
   the hydrated markup agree before the stored session is allowed to show. */
export function useSession(): { ready: boolean; session: Session | null } {
  const [state, setState] = useState<{ ready: boolean; session: Session | null }>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    const sync = () => setState({ ready: true, session: read() });
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
