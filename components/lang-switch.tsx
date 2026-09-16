'use client';

import { LANGS, setLang, useLang } from '@/lib/lang';

/* EN | ES, the current one filled in.
 *
 * Two segments rather than a single "Español" button, because a shop owner
 * who does not read English cannot be expected to spot that a word in a
 * language they do read is the way out. Both languages are always visible,
 * and each is written in itself. Until the preference is known the two
 * segments are drawn with neither filled, so the prerender matches. */
export function LangSwitch({ className }: { className?: string } = {}) {
  const { ready, lang } = useLang();

  return (
    <div className={`lang-switch${className ? ` ${className}` : ''}`}>
      {LANGS.map((item) => {
        const on = ready && item.id === lang;
        return (
          <button
            key={item.id}
            type="button"
            className={on ? 'on' : undefined}
            aria-pressed={on}
            aria-label={item.label}
            lang={item.id}
            title={item.label}
            data-track={`lang-${item.id}`}
            onClick={() => setLang(item.id)}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
}
