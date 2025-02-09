<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();
const items = reactive(test.getData());

onMounted(() => {
  test.run((i) => (items[i] = i));
})
</script>

<template>
  <template v-for="(item) in items">
    {{test.formatItem(item)}} 
  </template>
</template>
