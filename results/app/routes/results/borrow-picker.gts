import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { service } from "@ember/service";

import { experiments, runs } from "virtual:result-sets";

import { nameOf } from "#frameworks";
import { borrowLabel, formatRunName, titleOf } from "#utils";

import type { Borrowed } from "./+route.ts";
import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";
import type { ResultSet } from "#types";

export interface Borrow {
  name: string;
  data: ResultSet;
  framework: string;
}

/** `?col=` is positional against `?from=`: one framework per borrowed run. */
function requestedColumns(qp: QueryParams) {
  const raw = qp.get("col");

  return raw === undefined ? [] : raw.split(",");
}

/**
 * Every borrow currently on loan, in the order `?from=` lists them.
 *
 * A run whose requested framework it does not have falls back to its first
 * one, so an edited URL degrades instead of dropping the column.
 */
export function borrowsOf(qp: QueryParams, borrowed: Borrowed[]): Borrow[] {
  const requested = requestedColumns(qp);
  const borrows: Borrow[] = [];

  for (const [index, set] of borrowed.entries()) {
    const available = set.data.selections.frameworks;
    const asked = requested[index];
    const framework = asked !== undefined && available.includes(asked) ? asked : available[0];

    if (!framework) continue;

    borrows.push({ name: set.name, data: set.data, framework });
  }

  return borrows;
}

export class BorrowPicker extends Component<{
  borrowed: Borrowed[];
}> {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  get current() {
    return this.queryParams.get("q") ?? "";
  }

  /** the page's own run, and anything already borrowed, cannot be borrowed again */
  options = (list: string[], index: number) => {
    const taken = this.args.borrowed.map((set) => set.name);

    return list.filter(
      (name) => name !== this.current && (name === taken[index] || !taken.includes(name)),
    );
  };

  runOptions = (index: number) => this.options(runs, index);

  experimentOptions = (index: number) => this.options(experiments, index);

  /** the runs left to add, so the picker can hide its add control when empty */
  get unborrowed() {
    return this.options(runs.concat(experiments), -1);
  }

  @cached
  get borrows() {
    return borrowsOf(this.queryParams, this.args.borrowed);
  }

  labelAt = (index: number) => borrowLabel(index);

  frameworkAt = (index: number) => this.borrows[index]?.framework ?? "";

  isFrameworkAt = (index: number, name: string) => this.frameworkAt(index) === name;

  isSourceAt = (index: number, name: string) => this.args.borrowed[index]?.name === name;

  /**
   * `from` and `col` are positional against each other, so every edit
   * rewrites both lists together rather than touching one of them.
   */
  #commit(names: string[], frameworks: string[]) {
    // a column nobody has chosen yet is empty, and resolves to its run's
    // first framework. Trailing ones say nothing, so they stay out of the URL.
    let end = frameworks.length;

    while (end > 0 && !frameworks[end - 1]) end--;

    const chosen = frameworks.slice(0, end);

    this.router.transitionTo({
      queryParams: {
        from: names.join(",") || null,
        col: chosen.length ? chosen.join(",") : null,
      },
    });
  }

  get names() {
    return this.args.borrowed.map((set) => set.name);
  }

  get frameworks() {
    return this.args.borrowed.map((_, index) => this.frameworkAt(index));
  }

  setSource = (index: number, event: Event) => {
    const { value } = event.target as HTMLSelectElement;
    const names = this.names.slice();
    const frameworks = this.frameworks.slice();

    names[index] = value;
    // the new run may not have the old framework; borrowsOf falls back
    frameworks[index] = "";

    this.#commit(names, frameworks);
  };

  setFramework = (index: number, event: Event) => {
    const { value } = event.target as HTMLSelectElement;
    const frameworks = this.frameworks.slice();

    frameworks[index] = value;

    this.#commit(this.names, frameworks);
  };

  add = () => {
    const next = this.unborrowed[0];

    if (!next) return;

    this.#commit(this.names.concat(next), this.frameworks.concat(""));
  };

  removeAt = (index: number) => {
    const names = this.names.slice();
    const frameworks = this.frameworks.slice();

    names.splice(index, 1);
    frameworks.splice(index, 1);

    this.#commit(names, frameworks);
  };

  <template>
    <fieldset class="borrow-controls surface">
      <legend>borrow columns</legend>

      {{#each @borrowed as |set index|}}
        <div class="borrow-row">
          <span class="borrow-label">{{this.labelAt index}}</span>
          <label>
            from
            <select name="borrow-from-{{index}}" {{on "change" (fn this.setSource index)}}>
              <optgroup label="Runs">
                {{#each (this.runOptions index) as |name|}}
                  <option
                    value={{name}}
                    selected={{this.isSourceAt index name}}
                    title={{titleOf name}}
                  >{{formatRunName name}}</option>
                {{/each}}
              </optgroup>
              {{#if (this.experimentOptions index)}}
                <optgroup label="Experiments">
                  {{#each (this.experimentOptions index) as |name|}}
                    <option
                      value={{name}}
                      selected={{this.isSourceAt index name}}
                      title={{titleOf name}}
                    >{{formatRunName name}}</option>
                  {{/each}}
                </optgroup>
              {{/if}}
            </select>
          </label>
          <label>
            framework
            <select name="borrow-framework-{{index}}" {{on "change" (fn this.setFramework index)}}>
              {{#each set.data.selections.frameworks as |name|}}
                <option value={{name}} selected={{this.isFrameworkAt index name}}>{{nameOf
                    name
                  }}</option>
              {{/each}}
            </select>
          </label>
          <button type="button" {{on "click" (fn this.removeAt index)}}>remove</button>
        </div>
      {{/each}}

      {{#if this.unborrowed}}
        <button type="button" class="add-borrow" {{on "click" this.add}}>
          {{if @borrowed.length "+ borrow another" "+ borrow a column"}}
        </button>
      {{/if}}
    </fieldset>

    <style scoped>
      select {
        max-width: 40vw;
      }

      /* one borrow per line: the card is a column of the settings grid, so the
         row has to be allowed to shrink -- otherwise the longest run name sets
         its width and the card overflows the column */
      .borrow-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--gap-1) var(--gap-2);
        flex: 1 0 100%;
        min-width: 0;

        select {
          min-width: 0;
        }
      }
    </style>
  </template>
}
