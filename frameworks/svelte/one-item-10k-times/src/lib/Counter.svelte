<script lang="ts">
  import { helpers } from 'common';
  let count: number = $state(0)
  const increment = () => {
    count += 1
  }

  $effect(() => {
    helpers['1i10ku'].run((i) => count = i);
  });

  
</script>

<output>{count}</output>
