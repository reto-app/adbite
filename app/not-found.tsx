/* Any path the site does not know goes to the front page.
 *
 * Every one of these so far has been a mangled share link (a LinkedIn post
 * glued "¡Gracias" onto /advertisers), and the person behind it wanted the
 * site, not an apology. The status stays 404 so search engines never index
 * the junk path; the meta refresh works with scripts off, and the script
 * uses replace() so Back does not land here again. The link is for the
 * browser that honours neither. */
export default function NotFound() {
  return (
    <>
      <meta httpEquiv="refresh" content="0;url=/" />
      <script dangerouslySetInnerHTML={{ __html: 'location.replace("/")' }} />
      <p style={{ margin: 0, padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <a href="/">adbite.site</a>
      </p>
    </>
  );
}
