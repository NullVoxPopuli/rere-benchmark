import assert from 'node:assert';
import { existsSync, realpathSync } from 'node:fs';

// SAFETY: the types for byte-size are not correct
// @ts-expect-error
import bs from 'byte-size';
import { $ } from 'execa';
import * as si from 'systeminformation';

import {
  BENCH_NAME,
  COUNT,
  CPU_THROTTLE,
  FRAMEWORK,
  HEADLESS,
  SKIP_BUILD,
  TIMEOUT,
} from './arg.ts';

async function findChrome() {
  const macChrome =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  if (existsSync(macChrome)) {
    return macChrome;
  }

  const whichGoogleChrome = await $`which google-chrome`;

  // Resolve symlinks so Chrome can find its framework files
  // (e.g. a symlink at ~/Applications/google-chrome -> /Applications/Google Chrome.app/...)
  return realpathSync(whichGoogleChrome.stdout.trim());
}

export const chromeLocation = await findChrome();
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

  const hz = fastestDisplay.currentRefreshRate;

  // the frame-rate bench is meaningless without knowing the display's
  // ceiling, and the results app displays it for every run
  assert(hz, `Could not read the display's refresh rate`);

  return hz;
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

async function getInfo() {
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
    args: {
      SKIP_BUILD,
      CPU_THROTTLE,
      HEADLESS,
      COUNT,
      FRAMEWORK,
      BENCH_NAME,
      TIMEOUT,
    },
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

/**
 * The header of every result file: when and where the run happened, with
 * which flags. Resolved once at startup.
 */
export const info = await getInfo();
