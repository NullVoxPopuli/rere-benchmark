import Route from "@ember/routing/route";
import { service } from "@ember/service";

import { runs } from "virtual:result-sets";

import { fetchResultSet } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type Transition from "@ember/routing/transition";
import type { ResultSet } from "#types";

interface Params {
  a: string;
  b: string;
}

export interface NamedRun {
  name: string;
  data: ResultSet;
}

export interface Model {
  a: NamedRun;
  bs: NamedRun[];
}

/**
 * `b` holds every run the baseline is compared against, so a URL can name
 * any number of them: ?a=run1&b=run2,run3. Links that only ever compared
 * two runs keep working -- a single name is a list of one.
 */
export function splitRuns(b: string): string[] {
  return b.split(",").filter(Boolean);
}

export function joinRuns(names: string[]): string {
  return names.join(",");
}

export default class Compare extends Route<Model> {
  @service declare router: RouterService;

  queryParams = {
    a: { refreshModel: true },
    b: { refreshModel: true },
    // which framework to compare; both runs are already loaded, so no model impact
    framework: {},
    // which percentile of each run's samples to show (50 | 75 | 90)
    p: {},
  };

  beforeModel(transition: Transition) {
    const { to } = transition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const qps: Record<string, string> = (to as any)?.queryParams ?? {};

    if (qps["a"] && qps["b"]) return;

    transition.abort();
    this.router.transitionTo("compare", {
      queryParams: { ...qps, ...runsFor(qps["a"], qps["b"]) },
    });
  }

  // SAFETY: see note about JS Language mishap
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async model(params: Record<string, string>): Promise<Model> {
    // SAFETY: verified in beforeModel
    const { a, b } = params as unknown as Params;

    const names = [a].concat(splitRuns(b));

    try {
      const sets = await Promise.all(names.map((name) => fetchResultSet(name)));
      const named = names.map((name, i) => ({ name, data: sets[i] as ResultSet }));

      return {
        a: named[0] as NamedRun,
        bs: named.slice(1),
      };
    } catch (e) {
      console.error(e);
      // SAFETY: don't care -- the fact that people can throw non-errors is a mistake
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.router.transitionTo("error", { queryParams: { error: e.message } });
    }
  }
}

/**
 * The run next to `name`, preferring `direction` -- `runs` is
 * newest-first, so older runs are later in the list. Falls back to the
 * other side for the first and last run, and to `name` itself when it's
 * the only run there is.
 */
function neighborOf(name: string, direction: "older" | "newer") {
  const index = runs.indexOf(name);

  if (index === -1) return runs[0];

  const [preferred, fallback] =
    direction === "older" ? [index + 1, index - 1] : [index - 1, index + 1];

  return runs[preferred] ?? runs[fallback] ?? name;
}

/**
 * Fills in whichever of the two runs wasn't asked for, so linking to
 * /compare from a single run only has to name that run. A run linked as
 * the candidate (B) is compared against what came before it; one linked
 * as the baseline (A) is compared against what came after.
 */
function runsFor(a: string | undefined, b: string | undefined) {
  if (a && b) return { a, b };
  if (b) return { a: neighborOf(splitRuns(b)[0] ?? b, "older"), b };
  if (a) return { a, b: neighborOf(a, "newer") };

  // no runs named at all -- the two most recent
  return { a: runs[1] ?? runs[0], b: runs[0] };
}
