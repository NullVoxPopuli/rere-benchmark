import assert from 'node:assert';

import { serve } from './serve.ts';

const [, , folder] = process.argv;

assert(folder, `Folder required`);

const server = await serve(folder);
const address = server.address();

assert(address, `Could not boot`);

const url =
  typeof address === 'string'
    ? address
    : `http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`;

console.log({ url });
