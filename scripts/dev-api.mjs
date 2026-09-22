/* The `api/` directory, served by the dev server.
 *
 * In production those files are Vercel Functions: Vercel finds `api/**.ts`,
 * bundles each one and routes `/api/foo` to it. Nothing does that locally.
 * `vinext dev` serves the app and hands every other path to the router, so
 * `POST /api/uploads` came back as the 404 page — HTML, with a 404 on it —
 * and every upload in the product failed at its first request with "Could not
 * start the upload". So did every other endpoint: leads, notifications, the
 * menu scanner, the device sync a sideloaded Roku talks to.
 *
 * This is that routing, as a dev-only Vite plugin:
 *
 *   /api/uploads        -> api/uploads.ts
 *   /api/device/sync    -> api/device/sync.ts
 *
 * The handlers are web-standard — `export async function POST(request)` —
 * which is what Vercel's Node runtime wants and what this calls them with, so
 * a route that works here works there.
 *
 * Two details that are not obvious:
 *
 * Each file is bundled with esbuild rather than imported straight. Node can
 * strip the types by itself now, but it cannot resolve `../lib/server/db.js`
 * to a `.ts` file, which is how TypeScript's own ESM output is written and how
 * every one of these imports is spelled. esbuild resolves it the way tsc and
 * Vercel do. Dependencies stay external, so the bundle is only our own code
 * and the import cost is nothing.
 *
 * And `.env.local` is loaded into `process.env`. Vite only exposes `VITE_`
 * variables to the browser and nothing at all to a Node module it did not
 * load; the functions read `process.env.R2_ACCESS_KEY_ID` and friends, which
 * is exactly what Vercel gives them.
 */

import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const API_DIR = 'api';
const OUT_DIR = '.vinext/dev-api';
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs'];

/* Nothing here overwrites a variable the shell already set, so
   `R2_BUCKET=other npm run dev` still means what it says. */
async function loadEnv(root) {
  for (const name of ['.env', '.env.local']) {
    let text;
    try {
      text = await readFile(join(root, name), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const at = trimmed.indexOf('=');
      if (at < 1) continue;
      const key = trimmed.slice(0, at).trim();
      let value = trimmed.slice(at + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/** The source file behind a request path, or null if there is none. */
async function fileFor(root, pathname) {
  const route = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  /* No climbing out of api/ with a crafted path. */
  if (!route || route.includes('..') || route.startsWith('/')) return null;
  for (const extension of EXTENSIONS) {
    const candidate = resolve(root, API_DIR, route + extension);
    if (!candidate.startsWith(resolve(root, API_DIR))) return null;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* try the next extension */
    }
  }
  return null;
}

/* Bundled output is keyed by the file's own modification time, so an edit is
   picked up on the next request and an unchanged file is imported once. */
const built = new Map();

async function loadHandler(root, file) {
  const changed = (await stat(file)).mtimeMs;
  const cached = built.get(file);
  if (cached && cached.changed === changed) return cached.handler;

  const result = await build({
    entryPoints: [file],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    packages: 'external',
    write: false,
    sourcemap: 'inline',
    logLevel: 'silent',
  });

  const name = createHash('sha256').update(`${file}:${changed}`).digest('hex').slice(0, 16);
  const out = resolve(root, OUT_DIR, `${name}.mjs`);
  await mkdir(resolve(root, OUT_DIR), { recursive: true });
  await writeFile(out, result.outputFiles[0].text);

  const handler = await import(pathToFileURL(out).href);
  built.set(file, { changed, handler });
  return handler;
}

function requestFrom(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);

  if (req.method === 'GET' || req.method === 'HEAD') {
    return Promise.resolve(new Request(url, { method: req.method, headers }));
  }
  return new Promise((done, fail) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', fail);
    req.on('end', () => {
      done(new Request(url, { method: req.method, headers, body: Buffer.concat(chunks) }));
    });
  });
}

async function send(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    /* Undici reports the decoded length; Node sets its own. */
    if (key === 'content-length' || key === 'content-encoding') return;
    res.setHeader(key, value);
  });
  res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
}

export function devApi() {
  return {
    name: 'adbite:dev-api',
    /* Serve only. The built site's functions are Vercel's job. */
    apply: 'serve',
    enforce: 'pre',
    async configureServer(server) {
      const root = server.config.root;
      await loadEnv(root);

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0];
        if (!pathname.startsWith('/api/')) return next();

        let file;
        try {
          file = await fileFor(root, pathname);
        } catch {
          file = null;
        }
        /* An unknown /api path is a 404 from the API, not the app's 404 page:
           a JSON client should never have to parse HTML to learn it was
           wrong. */
        if (!file) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ message: `No API route for ${pathname}` }));
          return;
        }

        try {
          const route = await loadHandler(root, file);
          const method = (req.method ?? 'GET').toUpperCase();
          const handler = route[method] ?? (method === 'HEAD' ? route.GET : undefined) ?? route.default;
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ message: `${method} is not handled by ${pathname}` }));
            return;
          }
          const response = await handler(await requestFrom(req));
          await send(res, response);
        } catch (failure) {
          /* Loudly, and in the terminal: a function that throws in production
             is a 500 with a request id, and the equivalent here is the stack
             next to the request that caused it. */
          server.config.logger.error(`[api] ${pathname} failed\n${failure?.stack ?? failure}`);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ message: String(failure?.message ?? failure) }));
        }
      });
    },
  };
}
