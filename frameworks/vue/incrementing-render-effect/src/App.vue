<script setup lang="ts">
  import { ref, onMounted, onUpdated } from 'vue'
  import { helpers } from 'common';

  const test = helpers.incrementingRenderEffect();
  const out = ref(-1);
  const el = ref<HTMLOutputElement>();
  let advancer: (() => void) | undefined;

  onUpdated(() => {
    advancer?.();
  });

  onMounted(() => {
    test.doit({
      element: el.value!,
      get: () => out.value,
      set: (value: number) => out.value = value,
      setupAdvancer: (fn: () => void) => { advancer = fn; },
    });
  });
</script>

<template>
  <output ref="el">{{ out }}</output>
</template>
