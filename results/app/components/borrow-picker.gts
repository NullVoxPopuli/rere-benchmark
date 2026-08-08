import Component from "@glimmer/component";
import { service } from "@ember/service";

import { experiments, runs } from "virtual:result-sets";

import { nameOf } from "#frameworks";
import { borrowLabel, formatRunName, titleOf } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Borrowed } from "#routes/results.ts";
import type { ResultSet } from "#types";

export interface Borrow {
  name: string;
  data: ResultSet;
  framework: string;
}

export function borrowOf(
  router: RouterService,
  borrowed: Borrowed | undefined,
): Borrow | undefined {
  if (!borrowed) return;

  const available = borrowed.data.selections.frameworks;
  const requested = router.currentRoute?.queryParams["col"];
  const framework =
    typeof requested === "string" && available.includes(requested) ? requested : available[0];

  if (!framework) return;

  return { name: borrowed.name, data: borrowed.data, framework };
}

export class BorrowPicker extends Component<{
  borrowed: Borrowed | undefined;
}> {
  @service declare router: RouterService;

  get current() {
    const q = this.router.currentRoute?.queryParams["q"];

    return typeof q === "string" ? q : "";
  }

  get runOptions() {
    return runs.filter((name) => name !== this.current);
  }

  get experimentOptions() {
    return experiments.filter((name) => name !== this.current);
  }

  // only one borrow is possible so far; this becomes its position once
  // several can be on loan at once
  label = borrowLabel(0);

  get framework() {
    return borrowOf(this.router, this.args.borrowed)?.framework ?? "";
  }

  get isNone() {
    return !this.args.borrowed;
  }

  isSource = (name: string) => this.args.borrowed?.name === name;

  isFramework = (name: string) => this.framework === name;

  setSource = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { from: value || null, col: null } });
  };

  setFramework = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { col: value } });
  };

  remove = () => {
    this.router.transitionTo({ queryParams: { from: null, col: null } });
  };

  <template>
    <fieldset class="borrow-controls surface">
      <legend>borrow a column</legend>
      <label>
        from run
        <select name="borrow-from" {{on "change" this.setSource}}>
          <option value="" selected={{this.isNone}}>none</option>
          <optgroup label="Runs">
            {{#each this.runOptions as |name|}}
              <option
                value={{name}}
                selected={{this.isSource name}}
                title={{titleOf name}}
              >{{formatRunName name}}</option>
            {{/each}}
          </optgroup>
          {{#if this.experimentOptions.length}}
            <optgroup label="Experiments">
              {{#each this.experimentOptions as |name|}}
                <option
                  value={{name}}
                  selected={{this.isSource name}}
                  title={{titleOf name}}
                >{{formatRunName name}}</option>
              {{/each}}
            </optgroup>
          {{/if}}
        </select>
      </label>
      {{#if @borrowed}}
        <label>
          framework
          <select name="borrow-framework" {{on "change" this.setFramework}}>
            {{#each @borrowed.data.selections.frameworks as |name|}}
              <option value={{name}} selected={{this.isFramework name}}>{{nameOf name}}</option>
            {{/each}}
          </select>
        </label>
        {{! the table header carries only this letter, so the run it stands
            for has to be readable here }}
        <span class="units">shown as <span class="borrow-label">{{this.label}}</span></span>
        <button type="button" {{on "click" this.remove}}>remove</button>
      {{/if}}
    </fieldset>
  </template>
}
