import { pageTitle } from 'ember-page-title';
import { LinkTo } from '@ember/routing';

import { results } from 'virtual:result-sets';

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
