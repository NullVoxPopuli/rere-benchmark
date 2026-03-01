import assert from 'node:assert';
import { realpathSync } from 'node:fs';

// SAFETY: the types for byte-size are not correct
// @ts-expect-error
import bs from 'byte-size';
import { $ } from 'execa';
import * as si from 'systeminformation';

const whichGoogleChrome = await $`which google-chrome`;

// Resolve symlinks so Chrome can find its framework files
// (e.g. a symlink at ~/Applications/google-chrome -> /Applications/Google Chrome.app/...)
export const chromeLocation = realpathSync(whichGoogleChrome.stdout.trim());
export const yyyymmdd = new Date().toJSON();

assert(yyyymmdd, `Failed to find date`);

function normalizeCPUName(cpu: si.Systeminformation.CpuData) {
  const { brand, manufacturer } = cpu;

  const normalizedBrand = brand
    .replace('Processor', '')
    .replace(/\d+-Core/, '')
    .trim();

  return `${manufacturer} ${normalizedBrand}`;
}

function normalizeOS(os: si.Systeminformation.OsData) {
  const { distro, release } = os;

  const version = release.replace('LTS', '').trim();

  return {
    name: distro,
    version,
  };
}

/**
 * We're going to assume that if multiple displays are hooked up
 * you're going to want to run on the fastest display you have available.
 */
function getFastestDisplayHz(graphics: si.Systeminformation.GraphicsData) {
  const { displays } = graphics;
  // fastest -> slowest
  const [fastestDisplay] = displays.sort(
    (a, b) => (b.currentRefreshRate || 0) - (a.currentRefreshRate || 0),
  );

  assert(fastestDisplay, `Could not find display`);

  return fastestDisplay?.currentRefreshRate;
}

/**
 * This is a hack entirely based on convention of current mainstream browsers
 */
async function getBrowserInfo() {
  const { stdout } = await $`${chromeLocation} --version`;

  const str = stdout.trim();
  const chars = str.split('');
  const firstNumber = chars.findIndex((c) => c.match(/\d/));
  // Probably
  const name = str.slice(0, firstNumber).trim();
  const version = str.slice(firstNumber);

  return {
    name,
    version,
  };
}

export async function getCommitSha() {
  const { stdout } = await $`git rev-parse HEAD`;

  return stdout;
}

export async function getInfo() {
  const [cpu, graphics, memory, os, browser, sha] = await Promise.all([
    si.cpu(),
    si.graphics(),
    si.mem(),
    si.osInfo(),
    getBrowserInfo(),
    getCommitSha(),
  ]);

  const cpuName = normalizeCPUName(cpu);
  const osInfo = normalizeOS(os);
  const hz = getFastestDisplayHz(graphics);

  const result = {
    date: yyyymmdd,
    sha,
    environment: {
      machine: {
        os: {
          name: osInfo.name,
          version: osInfo.version,
        },
        cpu: cpuName,
        ram: bs(memory.total).toString(),
      },
      monitor: {
        hz,
      },
      browser: {
        name: browser.name,
        version: browser.version,
      },
    },
  };

  return result;
}
