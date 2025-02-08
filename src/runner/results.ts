import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getInfo, yyyymmdd } from './environment.ts';

const filePath = `./results/public/results/${yyyymmdd}.json`;

export const info = await getInfo();

async function read() {
  if (!existsSync(filePath)) {
    return {};
  }

  let buffer = await fs.readFile(filePath);
  let json = JSON.parse(buffer.toString());

  return json;
}

async function write(json: any) {
  await fs.writeFile(filePath, JSON.stringify(json, null, 2));
}

async function getResults() {
  let json = await read();
  return json.results;
}

async function saveResults(results: any) {
  let file = await read();

  file.results = results;

  await write(file);
}

export async function addResult(
  framework: string,
  benchName: string,
  result: any,
) {
  let existing = await getResults();

  existing[framework] ||= {};
  existing[framework][benchName] ||= [];
  existing[framework][benchName].push(result);

  await saveResults(existing);
}
