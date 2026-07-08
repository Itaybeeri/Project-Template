/**
 * serve.mjs — zero-dependency dev server for the Project Command Center.
 *
 *   node ProjectCommandCenter/serve.mjs            # → http://localhost:4317
 *   PORT=8080 node ProjectCommandCenter/serve.mjs
 *
 * Serves index.html and answers GET /api/state by re-parsing the repo LIVE on
 * every request (via collect.mjs). That is what makes the page's 60s
 * auto-refresh and its Refresh button reflect real changes on disk — edit a
 * spec, move a FEATURE-INDEX row, commit, and the next refresh shows it.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectState } from './collect.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4317;

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript' };

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/state') {
    try {
      const body = JSON.stringify(collectState());
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(e && e.message || e) }));
    }
    return;
  }

  // static: only ever serve files from this folder
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const file = join(HERE, rel);
  if (!file.startsWith(HERE) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});

server.listen(PORT, () => {
  const s = tryCollect();
  console.log(`\n  📊  Project Command Center  →  http://localhost:${PORT}\n`);
  if (s) console.log(`      ${s.project.name} · ${s.features.length} features · ${s.stats.active} in flight · ${s.stats.done} done\n`);
  console.log('      Live: every refresh re-reads docs/ + git. Ctrl-C to stop.\n');
});

function tryCollect() { try { return collectState(); } catch { return null; } }
