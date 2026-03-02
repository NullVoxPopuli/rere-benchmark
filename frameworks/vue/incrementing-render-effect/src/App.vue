<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();
const output = ref(-1);
let advancer: (() => void) | undefined;

watchEffect(() => {
  if (advancer) {
    advancer();
    return;
  }

  test.doit({
    get: () => output.value,
    set: (value: number) => output.value = value,
    setupAdvancer: (fn: () => void) => { advancer = fn; },
  });
});
</script>

<template>
  <output>{{ output }}</output>
</template>

