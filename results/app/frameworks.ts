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

  /**
   * The name of the package in package.json to read the json from
   * (Used by the benchmark runner)
   */
  package: string;
}

export const frameworks: Record<string, FrameworkInfo> = {
  angular: {
    // one of the stops of the logo's gradient, distinguishable from
    // the ember / svelte reds
    color: "#9717E7",
    logo: "/angular.svg",
    name: "Angular",
    url: "https://angular.dev/",
    package: "@angular/core",
  },
  ember: {
    color: "#E04E39",
    logo: "/ember.svg",
    name: "Ember",
    url: "https://emberjs.com/",
    package: "ember-source",
  },
  // Temporary copy of 'ember', for testing performance changes
  ["ember-canary"]: {
    color: "#E04E39",
    logo: "/ember.svg",
    name: "Ember",
    url: "https://emberjs.com/",
    package: "ember-source",
  },
  react: {
    color: "#61DBFB",
    logo: "/react.svg",
    name: "React",
    url: "https://react.dev/",
    package: "react",
  },
  solid: {
    color: "#2c4f7c",
    logo: "/solid.svg",
    name: "SolidJS",
    url: "https://www.solidjs.com/",
    package: "solid-js",
  },
  vue: {
    color: "#42b883",
    logo: "/vue.svg",
    name: "Vue.js",
    url: "https://vuejs.org/",
    package: "vue",
  },
  svelte: {
    color: "#ff3e00",
    logo: "/svelte.svg",
    name: "Svelte",
    url: "https://svelte.dev/",
    package: "svelte",
  },
  vanilla: {
    color: "#F7DF1E",
    logo: "/javascript.svg",
    name: "Vanilla JS",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    // no framework: the only versioned tool involved is the bundler
    package: "vite",
  },
};
