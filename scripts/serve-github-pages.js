#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PREFIX = '/appartement-411';
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') {
    res.writeHead(302, { Location: PREFIX + '/' });
    return res.end();
  }
  if (!pathname.startsWith(PREFIX)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  let rel = pathname.slice(PREFIX.length) || '/';
  if (rel.startsWith('/')) rel = rel.slice(1);
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(file, (err, stat) => {
    if (err) {
      res.writeHead(404);
      return res.end();
    }
    const target = stat.isDirectory() ? path.join(file, 'index.html') : file;
    const ext = path.extname(target);
    const headers = { 'Content-Type': mime[ext] || 'application/octet-stream' };
    if (ext === '.js' && (target.endsWith('sw.js') || target.includes(`${path.sep}fixtures${path.sep}`) && path.basename(target).includes('sw'))) {
      headers['Service-Worker-Allowed'] = PREFIX + '/';
    }
    res.writeHead(200, headers);
    fs.createReadStream(target).on('error', () => res.end()).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`GitHub Pages preview at http://${HOST}:${PORT}${PREFIX}/\n`);
});
