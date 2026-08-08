import { trackedMap } from "@ember/reactive/collections";
import Service, { service } from "@ember/service";

import type Owner from "@ember/owner";
import type RouterService from "@ember/routing/router-service";

/**
 * The query params, tracked one key at a time.
 *
 * Reading them off `router.currentRoute` looks equivalent and is not.
 * `currentRoute` is one tracked value replaced on every transition, so a
 * getter that reads a single param is invalidated by a change to any other
 * one: switching `?mode=` used to recompute every row's speeds, extremes
 * and colors, none of which depend on it.
 *
 * A tracked Map tags each key separately, and a key is written only when
 * its value actually changes, so a reader is only invalidated by the param
 * it actually read.
 */
export default class QueryParams extends Service {
  @service declare router: RouterService;

  /** what readers consume, so reading one param is not reading all of them */
  #values = trackedMap<string, string>();

  /**
   * The same key set, untracked. Diffing against the map itself would
   * entangle its collection tag, which every reader would then share --
   * the coarse invalidation this service exists to avoid.
   */
  #known = new Set<string>();

  constructor(owner: Owner) {
    super(owner);

    // Reading currentRoute here entangles whatever happens to be rendering
    // when the service is first looked up -- but only for that one render,
    // because the constructor never runs again.
    this.sync();
    this.router.on("routeDidChange", this.sync);
  }

  willDestroy() {
    this.router.off("routeDidChange", this.sync);
    super.willDestroy();
  }

  /** A param's raw value, or undefined when it is absent or empty. */
  get(name: string) {
    return this.#values.get(name);
  }

  sync = () => {
    const qps = this.router.currentRoute?.queryParams ?? {};
    const gone = new Set(this.#known);

    for (const [name, raw] of Object.entries(qps)) {
      const next = typeof raw === "string" && raw !== "" ? raw : undefined;

      if (next === undefined) continue;

      gone.delete(name);
      this.#known.add(name);

      // Writing an unchanged value still dirties the key, and dirtying
      // every param on every transition is the problem being solved. The
      // diff is the whole mechanism.
      if (this.#values.get(name) !== next) this.#values.set(name, next);
    }

    for (const name of gone) {
      this.#known.delete(name);
      this.#values.delete(name);
    }
  };
}
