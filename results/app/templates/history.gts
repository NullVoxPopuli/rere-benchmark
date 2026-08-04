import { LinkTo } from "@ember/routing";

import { pageTitle } from "ember-page-title";
import { experiments, runs } from "virtual:result-sets";

import { formatRunName, isoOf, relativeToNow, resultsQuery, titleOf } from "#utils";

import type { TOC } from "@ember/component/template-only";

const ResultList = <template>
  <nav>
    <ul class="run-list">
      {{#each @names as |resultName|}}
        <li>
          <LinkTo @route="results" @query={{resultsQuery resultName}} title={{titleOf resultName}}>
            <time datetime={{isoOf resultName}}>{{formatRunName resultName}}</time>
          </LinkTo>
          <span class="small">{{relativeToNow resultName}}</span>
        </li>
      {{/each}}
    </ul>
  </nav>
</template> satisfies TOC<{ names: string[] }>;

<template>
  {{pageTitle "History"}}

  <main>
    <h1>Choose benchmark run</h1>

    <section>
      <h2>Runs</h2>
      <ResultList @names={{runs}} />
    </section>

    {{#if experiments.length}}
      <section>
        <h2>Experiments</h2>
        <ResultList @names={{experiments}} />
      </section>
    {{/if}}
  </main>
</template>
