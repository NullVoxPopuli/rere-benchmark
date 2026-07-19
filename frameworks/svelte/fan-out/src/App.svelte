<script lang="ts">
  import { helpers } from 'common';

  let test = helpers.fanOut();
  let value = $state(test.getData());

  $effect(() => {
    test.doit((v: number) => {
      value = v;
    });
  });
</script>

<output>{#each test.consumerRange as c (c)}<span>{test.formatItem(value)}</span>{/each}</output>
