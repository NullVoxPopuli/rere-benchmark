import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export function serve(directory: string, port = 3000): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      throw new Error(`No request url?`);
    }

    let filePath = path.join(
      directory,
      req.url === '/' ? 'index.html' : req.url,
    );

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
      res.writeHead(200);
      return res.end(content);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server);
    });
  });
}
