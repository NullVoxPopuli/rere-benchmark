/**
 * killable has no published types: it decorates a server with a `kill()`
 * that destroys open sockets so `close` can actually finish.
 */
declare module 'killable' {
  import type { Server } from 'node:http';

  const killable: (_server: Server) => Server & { kill(): void };

  export default killable;
}
