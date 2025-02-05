interface Helpers {
  [benchName: string]: {
    name: string;
    verify: () => void;
    run: (set: (nextValue: number) => unknown) => unknown;
  }
}

export const helpers: Helpers;
