import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
const filePath = './results/app/results.json';

async function getResults() {
  if (!existsSync(filePath)) {
    return {};
  }

  let buffer = await fs.readFile(filePath);
  let json = JSON.parse(buffer.toString());
  return json;
}

async function saveResults(results: any) {
  await fs.writeFile(filePath, JSON.stringify(results, null, 2));
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
