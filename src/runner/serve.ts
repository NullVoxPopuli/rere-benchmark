import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// Come on, node
import killable from 'killable';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  // '.png': 'image/png',
  // '.jpg': 'image/jpeg',
  // '.jpeg': 'image/jpeg',
  // '.gif': 'image/gif',
  // '.svg': 'image/svg+xml',
  // '.ico': 'image/x-icon',
  // '.woff': 'font/woff',
  // '.woff2': 'font/woff2',
  // '.ttf': 'font/ttf',
  // '.eot': 'application/vnd.ms-fontobject',
  // '.otf': 'font/otf',
  // '.wasm': 'application/wasm',
};

export function serve(directory: string, port = 3000): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      throw new Error(`No request url?`);
    }

    const url = req.url.split('?')[0]!;
    const filePath = path.join(directory, url === '/' ? 'index.html' : url);
    const extname = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });

        return res.end('404 Not Found');
      }

      const contentType = mimeTypes[extname] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        /**
         * Every framework's app is served from this same origin, on this
         * same port, at this same `/index.html`. Without a cache directive
         * the browser is free to apply heuristic caching, and a hit across
         * that boundary means benchmarking one framework's build under
         * another framework's name.
         *
         * Nothing here should be cached anyway: each sample is a fresh page
         * load and the point is to measure the app, not the transport.
         */
        'Cache-Control': 'no-store',
      });

      return res.end(content);
    });
  });

  return new Promise((resolve, reject) => {
    // Without this the promise never settles when the port is taken, and
    // the runner hangs with no output rather than saying what is wrong.
    server.on('error', reject);

    server.listen(port, () => {
      killable(server);
      resolve(server);
    });
  });
}
