/* One place for the things that were drifting between pages.
 *
 * The contact address and the canonical origin used to disagree: metadata
 * pointed at adbite.co while every footer mailed adbite.site. Both now come
 * from here, so they cannot part company again. Change ORIGIN and MAIL
 * together if the domain moves. */

export const ORIGIN = 'https://adbite.site';
/** Sales and everything before an account exists. */
export const MAIL = 'info@adbite.site';
export const MAILTO = `mailto:${MAIL}`;
/** Once you are in: sign-in trouble, a board that will not update, a bill. */
export const SUPPORT_MAIL = 'support@adbite.site';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_MAIL}`;

/** The company page. The only place the site sends anyone off it. */
export const LINKEDIN = 'https://linkedin.com/company/adbitelocal';

/* Where artwork is served from, for a browser previewing it and for a TV
   downloading it.
 *
   This lives here rather than in lib/creatives.ts, where it used to, because
   both sides of the product need it and only one of them can load that file.
   `creatives.ts` is 'use client' and imports the browser Supabase client
   through the `@/` alias; an api/ function that reaches for this constant
   there drags all of that into a Node bundle that cannot resolve the alias,
   and the function 500s on every request before it runs a line of its own.
   That is exactly what happened to api/queue/review.ts. This file imports
   nothing, which is what makes it safe for either side. */
export const ASSETS_ORIGIN = 'https://assets.adbite.site';
