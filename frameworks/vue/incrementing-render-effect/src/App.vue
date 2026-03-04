<script setup lang="ts">
  import { ref, shallowRef, watchEffect } from 'vue'
  import { helpers } from 'common';

  const test = helpers.incrementingRenderEffect();
  const out = ref(0);
  const advancer = shallowRef<(() => void) | undefined>();

  let run = () => {
    advancer.value?.();
    return out.value;
  }

  test.doit({
    get: () => out.value,
    set: (value: number) => out.value = value,
    setupAdvancer: (fn: () => void) => { advancer.value = fn; },
  });
</script>

<template>
  <output>{{ run() }}</output>
</template>

