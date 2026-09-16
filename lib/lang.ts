'use client';

/* Which language the site reads in.
 *
 * A preference kept in this browser, the same way the workspace side used to
 * be before accounts existed. It is not a route: every page has one URL, the
 * prerendered HTML is English, and the copy swaps on the client once the
 * choice is known. A first-time visitor whose phone is set to Spanish gets
 * Spanish without being asked, which is most of the people this is for.
 *
 * The copy itself lives in lib/copy/, one file per page, each exporting an
 * `en` object and an `es` object typed off it, so a string missing from the
 * Spanish is a type error rather than an English sentence on a Spanish page. */

import { useEffect, useState } from 'react';

export type Lang = 'en' | 'es';

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'es', label: 'Español', short: 'ES' },
];

const KEY = 'adbite.lang';

/** The locale handed to Intl, so dates read the way the page does. Money and
    counts are the same in both: US Spanish keeps the comma and the dollar. */
export function localeOf(lang: Lang) {
  return lang === 'es' ? 'es-US' : 'en-US';
}

function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es';
}

function read(): Lang {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* storage is unavailable; fall through to the browser's own language */
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let current: Lang = 'en';
let known = false;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

function apply(lang: Lang) {
  current = lang;
  known = true;
  /* Screen readers, spell-checkers and the browser's translate prompt all
     read this, and the inline script in the layout sets it before hydration
     for the same reason. */
  document.documentElement.lang = lang;
  announce();
}

export function setLang(lang: Lang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* the choice lives for this page view only */
  }
  apply(lang);
}

/** `ready` stays false through the first paint so the prerender matches. */
export function useLang(): { ready: boolean; lang: Lang } {
  const [state, setState] = useState<{ ready: boolean; lang: Lang }>({
    ready: false,
    lang: 'en',
  });

  useEffect(() => {
    if (!known) apply(read());
    const sync = () => setState({ ready: true, lang: current });
    sync();
    listeners.add(sync);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY && isLang(event.newValue)) apply(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return state;
}

/** Pick one language's copy out of a {en, es} pair. The pair is typed so
    both halves have the same shape; this just chooses. */
export function useCopy<T>(dict: { en: T; es: T }): T {
  const { lang } = useLang();
  return dict[lang];
}
