<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { helpers } from 'common';

const count = ref(0)

watchEffect(() => {
  helpers['1i10ku'].run((i) => count.value = i)
})
</script>

<template>
  <output>{{count}}</output>
</template>

