import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

export const FRAMEWORKS = ['ember', 'react', 'solid', 'svelte', 'vue'] as const;

export interface BenchSpec {
  app: string;
  /**
   * Shrunk workloads so tests finish in seconds; the benches read these
   * from the query string (see common/src/tests/*.js).
   */
  query: string;
  /**
   * 'done-mark': the bench self-verifies its DOM and calls tryVerify,
   * which sets a `:done` performance mark on success and throws on
   * failure (surfaced as a pageerror).
   *
   * 'continuous': the bench runs forever (dbmon); assert liveness
   * structurally instead.
   */
  completion: 'done-mark' | 'continuous';
  /** text that must be on the page once the bench completed */
  expectText?: string;
}

export const BENCHES: BenchSpec[] = [
  {
    app: 'dbmon-with-chat',
    query: '',
    completion: 'continuous',
  },
  {
    app: 'fan-out',
    query: '?consumers=50&updates=500&burstSize=100',
    completion: 'done-mark',
    expectText: '[500]',
  },
  {
    app: 'incrementing-render-effect',
    query: '?updates=2000',
    completion: 'done-mark',
    expectText: '2000',
  },
  {
    app: 'one-item-many-updates',
    query: '?updates=300',
    completion: 'done-mark',
    expectText: '[299]',
  },
  {
    app: 'ten-k-items-one-time',
    query: '?items=200&updates=200',
    completion: 'done-mark',
    expectText: '[199]',
  },
];

export function appDir(framework: string, app: string) {
  return join(REPO_ROOT, 'frameworks', framework, app);
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

/**
 * Serves a built app's dist folder the same way the bench runner does:
 * plain static files, / -> /index.html.
 */
export async function serveDist(
  distDir: string,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const path = normalize(
      decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'),
    );
    let file = join(distDir, path === '/' ? 'index.html' : path);

    if (
      !file.startsWith(distDir) ||
      !existsSync(file) ||
      statSync(file).isDirectory()
    ) {
      res.writeHead(404).end('not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(res);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  if (address === null || typeof address === 'string') {
    throw new Error(`Could not determine port for static server of ${distDir}`);
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/**
 * Boots `vite dev` for an app and waits for it to answer. Dev mode has
 * its own failure modes (e.g. server.fs.allow blocking the linked
 * `common` package's web workers), so dbmon is tested here too.
 */
export async function startDevServer(
  dir: string,
  port: number,
): Promise<{ url: string; stop: () => Promise<void> }> {
  const child: ChildProcess = spawn(
    'pnpm',
    ['vite', '--port', String(port), '--strictPort'],
    {
      cwd: dir,
      stdio: 'ignore',
      detached: true,
    },
  );

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) break;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return {
    url,
    stop: async () => {
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          child.kill('SIGTERM');
        }
      }
    },
  };
}
