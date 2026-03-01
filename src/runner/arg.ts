import { styleText } from 'node:util';

const [, , ...args] = process.argv;

export const HEADLESS = bool('--headless');
export const COUNT = int('--count', 10);
export const CPU_THROTTLE = int('--cpu-throttle', 1);
export const FRAMEWORK = str('--framework');
export const BENCH_NAME = str('--bench');
export const SKIP_BUILD = bool('--skip-build');

function col1(name: string) {
  return styleText('yellow', name.padEnd(16));
}

function col2(value: unknown) {
  return String(value ?? '').padEnd(10);
}

function col3(description: string) {
  return styleText('dim', description);
}

function row(...cols: string[]) {
  return cols.join('');
}

console.log(
  [
    `Flag            Value           Description`,
    `------------------------------------------------------------`,
    row(
      col1('--skip-build'),
      col2(SKIP_BUILD),
      col3('re-use an existing build'),
    ),
    row(
      col1('--cpu-throttle'),
      col2(CPU_THROTTLE),
      col3('x emulated CPU slowdown'),
    ),
    row(col1('--headless'), col2(HEADLESS), col3('limited to 60 fps')),
    row(col1('--count'), col2(COUNT), col3('sample count')),
    row(col1('--framework'), col2(FRAMEWORK), ''),
    row(col1('--bench'), col2(BENCH_NAME), ''),
  ]
    .map((line) => '\t' + line)
    .join('\n'),
);

function bool(name: string) {
  return args.includes(name);
}

function str(name: string) {
  const arg = args.find((a) => a.startsWith(name));

  return arg?.split('=')[1];
}

function int(name: string, defaultValue: number) {
  const arg = args.find((a) => a.startsWith(name));

  if (!arg) return defaultValue;

  const str = arg.split('=')[1];

  if (!str) return defaultValue;

  const num = parseInt(str, 10);

  if (isNaN(num)) return defaultValue;

  return num;
}
