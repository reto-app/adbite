/* This machine, as the board server.
 *
 * The TVs poll one URL for one JSON document and whatever artwork it names.
 * That is the entire contract, and it is deliberately the same contract a real
 * backend would satisfy later — so the thing replacing this script does not
 * change anything on the Roku.
 *
 *   node server/serve.mjs                       serve ./board.json and ./ads
 *   node server/serve.mjs dist/export/board.json --port 8787
 *
 * The board is read from disk on every request rather than cached, so editing
 * board.json and waiting for the next poll is the whole edit loop.
 */

import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) flags.set(args[i].slice(2), args[i + 1]), (i += 1);
  else positional.push(args[i]);
}

const boardPath = resolve(positional[0] ?? 'board.json');
const adsDir = resolve(flags.get('ads') ?? join(dirname(boardPath), 'ads'));
const port = Number(flags.get('port') ?? 8787);

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.m4v': 'video/mp4',
};

function stamp() {
  return new Date().toTimeString().slice(0, 8);
}

/* Roku's roUrlTransfer sends its model in the UA, which is the one thing in a
   log line that tells a TV's poll apart from a browser tab left open. */
function who(request) {
  const agent = request.headers['user-agent'] ?? '';
  const roku = agent.match(/Roku\/[\w.]+|RokuOS[\w./]*/i);
  return roku ? roku[0] : agent.slice(0, 28) || 'unknown';
}

async function serveBoard(request, response) {
  let raw;
  try {
    raw = await readFile(boardPath, 'utf8');
  } catch (error) {
    console.log(`${stamp()}  500  board.json unreadable: ${error.message}`);
    response.writeHead(500, { 'content-type': 'text/plain' });
    return response.end('board.json could not be read');
  }

  try {
    JSON.parse(raw);
  } catch (error) {
    // Better a 500 the TV ignores than a 200 of broken JSON it caches.
    console.log(`${stamp()}  500  board.json is not valid JSON: ${error.message}`);
    response.writeHead(500, { 'content-type': 'text/plain' });
    return response.end('board.json is not valid JSON');
  }

  const etag = `"${createHash('sha1').update(raw).digest('hex').slice(0, 16)}"`;
  if (request.headers['if-none-match'] === etag) {
    console.log(`${stamp()}  304  board.json          ${who(request)}`);
    response.writeHead(304, { etag });
    return response.end();
  }

  console.log(`${stamp()}  200  board.json          ${who(request)}`);
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(raw),
    'cache-control': 'no-cache',
    etag,
  });
  response.end(raw);
}

async function serveAsset(request, response, name) {
  const path = resolve(adsDir, name);
  // resolve() collapses `..`, so this is the check that keeps a crafted path
  // from walking out of the ads directory and serving the rest of the disk.
  if (!path.startsWith(adsDir + sep)) {
    response.writeHead(403).end();
    return;
  }

  let info;
  try {
    info = await stat(path);
  } catch {
    console.log(`${stamp()}  404  ads/${name}`);
    response.writeHead(404, { 'content-type': 'text/plain' });
    return response.end('no such asset');
  }

  console.log(`${stamp()}  200  ads/${name.padEnd(18)}${who(request)}`);
  response.writeHead(200, {
    'content-type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'content-length': info.size,
    'cache-control': 'public, max-age=3600',
  });
  createReadStream(path).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');

  if (url.pathname === '/' || url.pathname === '/board.json') {
    return serveBoard(request, response);
  }
  if (url.pathname.startsWith('/ads/')) {
    return serveAsset(request, response, decodeURIComponent(url.pathname.slice(5)));
  }
  if (url.pathname === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' });
    return response.end('ok');
  }

  response.writeHead(404, { 'content-type': 'text/plain' });
  response.end('the board is at /board.json');
});

server.listen(port, () => {
  console.log(`  board    ${boardPath}`);
  console.log(`  ads      ${adsDir}`);
  console.log(`  serving  http://localhost:${port}/board.json`);
  console.log('');
});
