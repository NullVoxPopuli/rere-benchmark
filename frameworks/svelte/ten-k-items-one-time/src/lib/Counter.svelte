<script lang="ts">
  import { helpers } from 'common';
  let items = $state(Array(10_000));

  $effect(() => {
    helpers['10ki1u'].run((i) => {
      items[i] = i;
    });
  });
</script>

{#each items as item}
  {`${ item } `}
{/each}
