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
  ["lit-signals"]: {
    color: "#324FFF",
    logo: "/lit.svg",
    name: "Lit (Signals)",
    url: "https://lit.dev/",
    package: "lit",
  },
  preact: {
    color: "#673ab8",
    logo: "/preact.svg",
    name: "Preact",
    url: "https://preactjs.com/",
    package: "preact",
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
};

/**
 * Everything known about a framework a run mentions. A run naming one we
 * have no entry for is a gap in this file, not bad data.
 */
export function infoFor(name: string): FrameworkInfo {
  const info = frameworks[name];

  if (!info) {
    throw new Error(`Expected ${name} to be one of ${Object.keys(frameworks).join(", ")}`);
  }

  return info;
}

/**
 * How a framework likes to be written, for prose and form controls.
 * Falls back to the key so an unknown framework is still nameable in
 * builds where the assert above is compiled out.
 */
export function nameOf(framework: string) {
  return frameworks[framework]?.name ?? framework;
}
