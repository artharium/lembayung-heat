// A tiny static server for game/ (Node 22, standard library only), so an entry can be played
// locally without a build step: `node serve.ts` serves game/ on http://localhost:8080.
// It sends the MIME types a browser game needs, refuses any path outside game/, answers a
// /healthz probe for scripts that want to know it is up, and otherwise does nothing clever:
// this is a development convenience, not a web server for the internet.
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;
// v3: --host to bind somewhere other than loopback, --verbose to log what
// the browser actually asks for (handy when a 404 hides in the console).
// v5: game/src now carries seven more modules (jobs, collectibles, stunts,
// weather, heat, story2, pedreact) — all plain static files, served the
// same way as the rest of the game.
const hostIndex = args.indexOf('--host');
const host = hostIndex === -1 ? '127.0.0.1' : args[hostIndex + 1] || '127.0.0.1';
const verbose = args.includes('--verbose');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  // A liveness probe for scripts: GET /healthz answers "ok" without
  // touching the game files, so a test harness can wait for the server
  // before it opens the game.
  if (pathname === '/healthz') {
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('ok');
    return;
  }
  // v4: the shot list for the screenshot tooling — GET /shots answers the
  // repo's shots.json (the four staged scenes and their ?shot queries),
  // so a harness can read the list over HTTP instead of from disk, and a
  // missing or renamed shot shows up here before a screenshot run does.
  if (pathname === '/shots') {
    try {
      const list = readFileSync(resolve(fileURLToPath(new URL('./shots.json', import.meta.url))), 'utf-8');
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }).end(list);
    } catch {
      response.writeHead(404).end('shots.json not found');
    }
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size: number;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  if (verbose) console.error(`${request.method} ${pathname} -> 200 (${size} bytes)`);
  // HEAD asks for headers only: no body, or the browser waits for bytes
  // that never come.
  if (request.method === 'HEAD') { response.end(); return; }
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`game/ is on http://${host}:${port}`);
});
