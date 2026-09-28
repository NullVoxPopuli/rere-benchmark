import { LinkTo } from "@ember/routing";

function getError() {
  const qps = new URLSearchParams(window.location.search);

  return qps.get("error");
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

  <style scoped>
    main.error-page {
      display: grid;
      gap: 1rem;

      h1 {
        margin: 0;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
      }

      .error-box {
        border: 1px solid darkred;
        border-radius: 0.25rem;
        padding: 1rem;
      }
    }
  </style>
</template>
