import http from 'node:http';
import fs from 'node:fs';
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

    let filePath = path.join(
      directory,
      req.url === '/' ? 'index.html' : req.url,
    );
    let extname = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }

      const contentType = mimeTypes[extname] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(content);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      killable(server);
      resolve(server);
    });
  });
}
