#!/usr/bin/env node
// Dependency-free route smoke test for the static export (SPA mode). Serves the
// exported `out/` directory with a tiny in-process static file server and
// asserts that the non-backend routes resolve as expected. Exits non-zero on
// the first failure so it can gate CI.
//
// Usage: npm run build && npm run smoke
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const PORT = Number(process.env.SMOKE_PORT || 8123);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = fileURLToPath(new URL('../out', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

// Routes that ship as static files. The viewer shells (/file, /menu) are now
// static too; the real `/file/:id/:random` URLs and the public vcard pages are
// proxied to the backend in production (see vercel.json), so they're not tested
// here.
const checks = [
  { path: '/', expect: 200 },
  { path: '/login', expect: 200 },
  { path: '/faq', expect: 200 },
  { path: '/terms', expect: 200 },
  { path: '/privacy', expect: 200 },
  { path: '/support', expect: 200 },
  { path: '/data-deletion', expect: 200 },
  { path: '/forgot-password', expect: 200 },
  { path: '/reset-password', expect: 200 },
  { path: '/file', expect: 200 },
  { path: '/menu', expect: 200 },
  { path: '/this-route-should-not-exist', expect: 404 },
];

// Resolve a request path to a file in `out/`, mirroring static hosting:
// `/login` -> `login.html`, `/` -> `index.html`, `/_next/x.js` -> `_next/x.js`.
async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0].split('#')[0]));
  if (clean.includes('..')) return null;
  const base = clean === '/' ? '/index.html' : clean;
  const candidates = extname(base) !== '' ? [base] : [`${base}.html`, `${base}/index.html`];
  for (const rel of candidates) {
    const abs = join(OUT_DIR, rel);
    try {
      if ((await stat(abs)).isFile()) return abs;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function createStaticServer() {
  return createServer(async (req, res) => {
    const abs = await resolveFile(req.url || '/');
    if (abs) {
      res.statusCode = 200;
      res.setHeader('content-type', MIME[extname(abs)] || 'application/octet-stream');
      res.end(await readFile(abs));
      return;
    }
    let body = 'Not Found';
    try {
      body = await readFile(join(OUT_DIR, '404.html'));
    } catch {
      // fall back to the plain string
    }
    res.statusCode = 404;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(body);
  });
}

async function main() {
  try {
    await stat(join(OUT_DIR, 'index.html'));
  } catch {
    console.error(`✗ no static export found at ${OUT_DIR}. Run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }

  const server = createStaticServer();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  try {
    const failures = [];
    for (const { path, expect } of checks) {
      let status = 0;
      try {
        const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
        status = res.status;
      } catch (err) {
        console.log(`✗ ${path} -> request failed: ${err.message}`);
        failures.push(path);
        continue;
      }
      const ok = status === expect;
      console.log(`${ok ? '✓' : '✗'} ${path} -> ${status} (expected ${expect})`);
      if (!ok) failures.push(path);
    }

    if (failures.length > 0) {
      console.error(`\n${failures.length} of ${checks.length} smoke checks failed.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${checks.length} smoke checks passed.`);
    }
  } finally {
    server.close();
  }
}

main();
