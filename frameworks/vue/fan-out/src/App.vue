<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { helpers } from 'common';

const test = helpers.fanOut();
const value = ref(test.getData())

watchEffect(() => {
  test.doit((v: number) => (value.value = v))
})
</script>

<template>
  <output><span v-for="c in test.consumerRange" :key="c">{{test.formatItem(value)}}</span></output>
</template>
