<script lang="ts">
  import { helpers } from 'common';

  let test = helpers.oneItem10kUpdates();
  let count: number = $state(test.getData())

  $effect(() => {
    test.run((i) => count = i);
  });

  
</script>

<output>{test.formatItem(count)}</output>
