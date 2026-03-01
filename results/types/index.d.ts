/// <reference types="@embroider/core/virtual" />
/// <reference types="vite/client" />
import '@glint/template';

declare module 'virtual:result-sets' {
  export const results: string[];
}

declare global {
  interface HTMLStyleElementAttributes {
    scoped: '';
    inline: '';
  }
}
