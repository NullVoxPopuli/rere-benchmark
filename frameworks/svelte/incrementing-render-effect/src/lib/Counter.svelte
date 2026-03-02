<script lang="ts">
  import { helpers } from 'common';

  const test = helpers.incrementingRenderEffect();
  let output: number = $state(-1);
  let advancer: (() => void) | undefined;

  $effect(() => {
    if (advancer) {
      advancer();
      return;
    }

    test.doit({
      get: () => output,
      set: (value: number) => output = value,
      setupAdvancer: (fn: () => void) => { advancer = fn; },
    });
  });
</script>

<output>{output}</output>
