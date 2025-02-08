<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { helpers } from 'common';

const items = reactive(Array(10_000).fill(0));

onMounted(() => {
  helpers['10ki1u-25p'].run((i) => (items[i] = i));
})
function appendSpace(x: string) {
return `${x} `;
}
</script>

<template>
  <template v-for="(item) in items">
    {{appendSpace(item)}} 
  </template>
</template>
