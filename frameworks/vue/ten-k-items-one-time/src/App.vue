<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { helpers } from 'common';

const items = ref(Array(10_000));

watchEffect(() => {
  helpers['10ki1u'].run((i) => (this.items[i] = i));
})
</script>

<template>
  <template v-for="item in items">
    {{item}}
  </template>
</template>
