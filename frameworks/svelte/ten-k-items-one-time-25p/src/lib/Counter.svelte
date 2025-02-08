<script lang="ts">
  import { helpers } from 'common';
  let items = $state(Array(10_000).fill(0));

  $effect(() => {
    helpers['10ki1u-25p'].run((i) => {
      items[i] = i;
    });
  });
</script>

{#each items as item}
  {`${ item } `}
{/each}
