import Route from "@ember/routing/route";
import { service } from "@ember/service";

import { results } from "virtual:result-sets";

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
  b: NamedRun;
}

export default class Compare extends Route<Model> {
  @service declare router: RouterService;

  queryParams = {
    a: { refreshModel: true },
    b: { refreshModel: true },
    // which framework to compare; both runs are already loaded, so no model impact
    framework: {},
  };

  beforeModel(transition: Transition) {
    const { to } = transition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const qps: Record<string, string> = (to as any)?.queryParams ?? {};

    if (qps["a"] && qps["b"]) return;

    transition.abort();
    this.router.transitionTo("compare", {
      queryParams: {
        ...qps,
        // default to comparing the two most recent runs
        a: qps["a"] ?? results[1] ?? results[0],
        b: qps["b"] ?? results[0],
      },
    });
  }

  // SAFETY: see note about JS Language mishap
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async model(params: Record<string, string>): Promise<Model> {
    // SAFETY: verified in beforeModel
    const { a, b } = params as unknown as Params;

    try {
      const [dataA, dataB] = await Promise.all([fetchResultSet(a), fetchResultSet(b)]);

      return {
        a: { name: a, data: dataA },
        b: { name: b, data: dataB },
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

async function fetchResultSet(name: string): Promise<ResultSet> {
  const response = await fetch(`/results/${name}.json`);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.json();
}
