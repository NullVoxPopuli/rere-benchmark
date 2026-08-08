import { tracked } from "@glimmer/tracking";
import Service, { service } from "@ember/service";

import type Owner from "@ember/owner";
import type RouterService from "@ember/routing/router-service";

/**
 * Every query param the app reads. Anything absent from this list is
 * invisible to the rest of the app, which is the point of the list.
 */
const PARAMS = [
  "q",
  "from",
  "col",
  "hide",
  "sort",
  "mode",
  "p",
  "curve",
  "a",
  "b",
  "framework",
] as const;

export type ParamName = (typeof PARAMS)[number];

/**
 * The query params, one tracked cell each.
 *
 * Reading them off `router.currentRoute` looks equivalent and is not.
 * `currentRoute` is one tracked value replaced on every transition, so a
 * getter that reads a single param is invalidated by a change to any other
 * one: switching `?mode=` used to recompute every row's speeds, extremes
 * and colors, none of which depend on it.
 *
 * Here each param is its own cell, written only when its value actually
 * changes, so a reader is only invalidated by the param it actually read.
 */
export default class QueryParams extends Service {
  @service declare router: RouterService;

  @tracked q?: string;
  @tracked from?: string;
  @tracked col?: string;
  @tracked hide?: string;
  @tracked sort?: string;
  @tracked mode?: string;
  @tracked p?: string;
  @tracked curve?: string;
  @tracked a?: string;
  @tracked b?: string;
  @tracked framework?: string;

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

  sync = () => {
    const qps = this.router.currentRoute?.queryParams ?? {};

    for (const name of PARAMS) {
      const raw = qps[name];
      const next = typeof raw === "string" && raw !== "" ? raw : undefined;

      // Writing an unchanged value still dirties the cell, and dirtying
      // every cell on every transition is the problem this service exists
      // to solve. The diff is the whole mechanism.
      if (this[name] !== next) this[name] = next;
    }
  };
}
