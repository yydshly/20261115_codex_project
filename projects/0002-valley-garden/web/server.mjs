import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/__health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ app: 'valley-garden', pid: process.pid, runId: process.env.VALLEY_GARDEN_RUN_ID || 'development' })); return;
    }
    const relative = pathname.replace(/^\/+/, '') + (pathname.endsWith('/') ? 'index.html' : '');
    const path = resolve(root, relative);
    if (!path.startsWith(root + sep) || relative.split(/[\\/]/).some(p => p.startsWith('.'))) {
      res.writeHead(403).end('Forbidden'); return;
    }
    if (!(await stat(path)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(path));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Valley Garden: http://127.0.0.1:${port}`));
