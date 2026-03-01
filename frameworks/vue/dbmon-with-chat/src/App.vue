<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();
const count = ref(test.getData())

watchEffect(() => {
  test.doit((i) => count.value = i)
})
</script>

<template>
  <output>{{test.formatItem(count)}}</output>
</template>

