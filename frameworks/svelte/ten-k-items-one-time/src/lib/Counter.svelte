<script lang="ts">
  import { helpers } from 'common';

  let test = helpers.tenKitems1UpdateEach();
  let items = $state(test.getData());

  $effect(() => {
    test.run((i) => {
      items[i] = i;
    });
  });
</script>

{#each items as item}{test.formatItem(item)}{/each}
