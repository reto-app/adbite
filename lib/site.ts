/* One place for the things that were drifting between pages.
 *
 * The contact address and the canonical origin used to disagree: metadata
 * pointed at adbite.co while every footer mailed adbite.site. Both now come
 * from here, so they cannot part company again. Change ORIGIN and MAIL
 * together if the domain moves. */

export const ORIGIN = 'https://adbite.site';
export const MAIL = 'info@adbite.site';
export const MAILTO = `mailto:${MAIL}`;

/** The company page. The only place the site sends anyone off it. */
export const LINKEDIN = 'https://linkedin.com/company/adbitelocal';
