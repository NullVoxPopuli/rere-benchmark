import { LinkTo } from "@ember/routing";

import { pageTitle } from "ember-page-title";
import { experiments, runs } from "virtual:result-sets";

function qp(resultName: string) {
  return { q: resultName };
}

<template>
  {{pageTitle "History"}}

  <main>
    <h1>Choose benchmark run</h1>

    <section>
      <h2>Runs</h2>
      <nav>
        <ul>
          {{#each runs as |resultName|}}
            <li>
              <LinkTo @route="results" @query={{qp resultName}}>
                {{resultName}}
              </LinkTo>
            </li>
          {{/each}}
        </ul>
      </nav>
    </section>

    {{#if experiments.length}}
      <section>
        <h2>Experiments</h2>
        <nav>
          <ul>
            {{#each experiments as |resultName|}}
              <li>
                <LinkTo @route="results" @query={{qp resultName}}>
                  {{resultName}}
                </LinkTo>
              </li>
            {{/each}}
          </ul>
        </nav>
      </section>
    {{/if}}
  </main>
</template>
