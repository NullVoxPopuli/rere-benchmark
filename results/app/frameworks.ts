export interface FrameworkInfo {
  /**
   * How the framework likes to be written as
   */
  name: string;
  /**
   * The framework's primary brand color
   */
  color: string;
  /**
   * The framework's logo
   */
  logo: string;
  /**
   * A place where folks can learn more about this framework
   */
  url: string;
}

export const frameworks: Record<string, FrameworkInfo> = {
  ember: {
    color: '#E04E39',
    logo: '/ember.svg',
    name: 'Ember',
    url: 'https://emberjs.com/',
  },
  react: {
    color: '#61DBFB',
    logo: '/react.svg',
    name: 'React',
    url: 'https://react.dev/',
  },
  solid: {
    color: '#2c4f7c',
    logo: '/solid.svg',
    name: 'SolidJS',
    url: 'https://www.solidjs.com/',
  },
  vue: {
    color: '#42b883',
    logo: '/vue.svg',
    name: 'Vue.js',
    url: 'https://vuejs.org/',
  },
  svelte: {
    color: '#ff3e00',
    logo: '/svelte.svg',
    name: 'Svelte',
    url: 'https://svelte.dev/',
  },
};
