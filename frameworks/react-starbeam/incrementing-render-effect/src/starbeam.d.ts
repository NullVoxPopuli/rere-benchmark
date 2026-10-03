// @starbeam/* 0.10.0 / 0.9.2 declare `types: "./dist/index.d.ts"` but the
// tarballs only contain JS; these cover the APIs the benches use.
declare module '@starbeam/universal' {
  export interface Cell<T> {
    current: T;
    set(value: T): boolean;
  }
  export function Cell<T>(value: T): Cell<T>;
}

declare module '@starbeam/react' {
  import type { ReactNode } from 'react';
  export function useReactive<T>(compute: () => T, bridge?: unknown[]): T;
  export function Starbeam(props: { children: ReactNode }): ReactNode;
}

declare module '@starbeam/collections' {
  export const reactive: {
    array<T>(values: T[]): T[];
    Map<K, V>(): Map<K, V>;
    Set<T>(): Set<T>;
    object<T extends object>(value: T): T;
  };
}
