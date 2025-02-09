import assert from 'node:assert';
import { serve } from './serve.ts';

const [, , folder] = process.argv;

assert(folder, `Folder required`);

let server = await serve(folder);
let address = server.address();

assert(address, `Could not boot`);

let url =
  typeof address === 'string'
    ? address
    : `http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`;

console.log({ url });
