const [, , ...args] = process.argv;

export const HEADLESS = bool('--headless');
export const COUNT = int('--count', 10);
export const FRAMEWORK = str('--framework');
export const BENCH_NAME = str('--bench');
export const SKIP_BUILD = bool('--skip-build');

console.log({
  '--headdless': HEADLESS,
  '--count': COUNT,
  '--framework': FRAMEWORK,
  '--bench': BENCH_NAME,
  '--skip-build': SKIP_BUILD,
});

function bool(name: string) {
  return args.includes(name);
}

function str(name: string) {
  let arg = args.find((a) => a.startsWith(name));

  return arg?.split('=')[1];
}

function int(name: string, defaultValue: number) {
  let arg = args.find((a) => a.startsWith(name));

  if (!arg) return defaultValue;

  let str = arg.split('=')[1];

  if (!str) return defaultValue;

  let num = parseInt(str, 10);

  if (isNaN(num)) return defaultValue;

  return num;
}
