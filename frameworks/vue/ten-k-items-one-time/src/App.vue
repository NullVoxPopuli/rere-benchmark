<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { helpers } from 'common';

const items = reactive(Array(10_000));

onMounted(() => {
  helpers['10ki1u'].run((i) => (items[i] = i));
})
function appendSpace(x) {
return `${x} `;
}
</script>

<template>
  <template v-for="(item) in items">
    {{appendSpace(item)}} 
  </template>
</template>
