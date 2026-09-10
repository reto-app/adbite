import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

// Vinext's Cloudflare build puts static route snapshots next to the worker.
// Vercel serves them from dist/client, so mirror those snapshots into standard
// directory indexes after each build.
const client = 'dist/client';
const snapshots = 'dist/server/prerendered-routes';

for (const file of await readdir(snapshots)) {
  if (!file.endsWith('.html')) continue;
  const route = file === 'index.html' || file === '404.html'
    ? file
    : join(file.slice(0, -'.html'.length), 'index.html');
  const destination = join(client, route);
  await mkdir(join(destination, '..'), { recursive: true });
  await rm(destination, { force: true });
  await cp(join(snapshots, file), destination);
}
