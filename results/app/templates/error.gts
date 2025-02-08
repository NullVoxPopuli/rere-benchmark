import { LinkTo } from '@ember/routing';

function getError() {
  const qps = new URLSearchParams(window.location.search);
  return qps.get('error');
}
<template>
  <main class="error-page">
    <h1>Oh no!</h1>

    <h2 class="small-h2">An error has occurred.</h2>

    <div class="error-box">
      {{(getError)}}
    </div>

    <LinkTo @route="application">Home</LinkTo>
  </main>
</template>
