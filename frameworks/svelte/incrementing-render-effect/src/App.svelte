<script lang="ts">
  import { helpers } from 'common';

  const test = helpers.incrementingRenderEffect();
  let output: number = $state(0);
  let advancer: (() => void) | undefined = $state();

  function run() {
    let value = output;
    advancer?.();
    return value;
  }

  test.doit({
    get: () => output,
    set: (value: number) => output = value,
    setupAdvancer: (fn: () => void) => { advancer = fn; },
  });
</script>

<output>{run()}</output>
