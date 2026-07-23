/* eslint-disable no-console */

const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const BUILD_ROOT = path.resolve(__dirname, '..', 'dist', 'src');
const INDEX_PATH = path.join(BUILD_ROOT, 'index.html');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function parsePort() {
  const portIndex = process.argv.indexOf('--port');
  const value = portIndex >= 0 ? process.argv[portIndex + 1] : process.env.OFFLINE_PORT;
  const port = value == null ? DEFAULT_PORT : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid offline port: ${value}`);
  }
  return port;
}

function isInsideBuildRoot(filePath) {
  const relativePath = path.relative(BUILD_ROOT, filePath);
  return relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

function resolveRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, `http://${HOST}`).pathname);
  } catch (error) {
    return null;
  }

  const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
  const filePath = path.resolve(BUILD_ROOT, relativePath);
  return isInsideBuildRoot(filePath) ? filePath : null;
}

function sendFile(response, filePath) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': stats.size,
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

function openBrowser(url) {
  if (process.argv.includes('--no-open')) return;

  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/d', '/s', '/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const browser = childProcess.spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  browser.on('error', () => {});
  browser.unref();
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Offline build not found. Run `corepack yarn build:offline` first.');
    process.exitCode = 1;
    return;
  }

  let port;
  try {
    port = parsePort();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Bad request');
      return;
    }
    sendFile(response, filePath);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try: corepack yarn start:offline --port 3001`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}`;
    console.log(`Duelyst offline is running at ${url}`);
    console.log('Press Ctrl+C to stop. Saves remain in this browser profile and port.');
    openBrowser(url);
  });
}

main();
