import { $ } from 'execa';
import * as si from 'systeminformation';
// SAFETY: the types for byte-size are not correct
// @ts-expect-error
import bs from 'byte-size';
import assert from 'node:assert';

const whichGoogleChrome = await $`which google-chrome`;

export const chromeLocation = whichGoogleChrome.stdout.trim();
export const yyyymmdd = new Date().toJSON().split('T')[0];

assert(yyyymmdd, `Failed to find date`);

function normalizeCPUName(cpu: si.Systeminformation.CpuData) {
  let { brand, manufacturer } = cpu;

  let normalizedBrand = brand
    .replace('Processor', '')
    .replace(/\d+-Core/, '')
    .trim();

  return `${manufacturer} ${normalizedBrand}`;
}

function normalizeOS(os: si.Systeminformation.OsData) {
  let { distro, release } = os;

  let version = release.replace('LTS', '').trim();

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
  let { displays } = graphics;
  // fastest -> slowest
  let [fastestDisplay] = displays.sort(
    (a, b) => (b.currentRefreshRate || 0) - (a.currentRefreshRate || 0),
  );

  assert(fastestDisplay, `Could not find display`);

  return fastestDisplay?.currentRefreshRate;
}

/**
 * This is a hack entirely based on convention of current mainstream browsers
 */
async function getBrowserInfo() {
  const { stdout } = await $`google-chrome --version`;

  let str = stdout.trim();
  let chars = str.split('');
  let firstNumber = chars.findIndex((c) => c.match(/\d/));
  // Probably
  let name = str.slice(0, firstNumber).trim();
  let version = str.slice(firstNumber);

  return {
    name,
    version,
  };
}

export async function getInfo() {
  let cpu = await si.cpu();
  let graphics = await si.graphics();
  let memory = await si.mem();
  let os = await si.osInfo();

  let cpuName = normalizeCPUName(cpu);
  let osInfo = normalizeOS(os);
  let hz = getFastestDisplayHz(graphics);
  let browser = await getBrowserInfo();

  let result = {
    date: yyyymmdd,
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
