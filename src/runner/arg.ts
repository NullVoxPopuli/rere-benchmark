const [, , ...args] = process.argv;

export const HEADLESS = bool('--headless');
export const COUNT = int('--count', 10);

console.log({
  '--headdless': HEADLESS,
  '--count': COUNT,
});

function bool(name: string) {
  return args.includes(name);
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
