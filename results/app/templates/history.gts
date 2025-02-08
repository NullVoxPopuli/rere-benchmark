import { pageTitle } from 'ember-page-title';
import { LinkTo } from '@ember/routing';

// TODO: generate this from a build plugin
// manual for now
//
// NOTE: most recent on top -- least recent on bottom
export const results = ['2025-02-07'];

function qp(resultName: string) {
  return { q: resultName };
}

<template>
  {{pageTitle "History"}}

  <main>
    <h1>Choose benchmark run</h1>
    <nav>
      <ul>
        {{#each results as |resultName|}}
          <li>
            <LinkTo @route="results" @query={{qp resultName}}>
              {{resultName}}
            </LinkTo>
          </li>
        {{/each}}
      </ul>
    </nav>
  </main>
</template>
