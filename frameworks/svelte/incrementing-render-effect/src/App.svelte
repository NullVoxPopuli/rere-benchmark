<script lang="ts">
  import { onMount } from 'svelte';
  import { helpers } from 'common';

  const test = helpers.incrementingRenderEffect();
  let output: number = $state(-1);
  let el: HTMLOutputElement;
  let advancer: (() => void) | undefined;

  $effect(() => {
    output;
    advancer?.();
  });

  onMount(() => {
    test.doit({
      element: el,
      get: () => output,
      set: (value: number) => output = value,
      setupAdvancer: (fn: () => void) => { advancer = fn; },
    });
  });
</script>

<output bind:this={el}>{output}</output>
