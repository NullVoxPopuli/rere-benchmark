/**
 * 960 frames:
 * - 16s @ 60fps
 * - 4s @ 240fps
 *
 * 480 frames:
 * - 8s @ 60fps
 * - 2s @ 240fps
 *
 * 120 frames:
 * - 2s @ 60fps
 * - 0.5s @ 240fps
 */
const NUM_FRAMES_TO_WAIT = 960;

// TODO?: also have a second-based timeout?

function tryVerify(label, check, attempts = 0) {
  if (check()) {
    console.timeEnd(label);
    performance.mark(`${label}:done`);
    console.log(`Rendered in ${attempts} frames`);
    return;
  }

  if (attempts < NUM_FRAMES_TO_WAIT) {
    requestAnimationFrame(() => {
      tryVerify(label, check, attempts + 1);
    });
    return;
  }

  throw new Error(
    `Could not determine verified state within ${attempts} frames`,
  );
}

export const helpers = {
  '1i10ku': {
    name: '1 Item, 10k updates',
    verify: () => {
      let result = document.querySelector('output').textContent;

      return result === '9999';
    },
    /**
     * @param {(nextValue: number) => unknown} set
     */
    run: (set) => {
      requestAnimationFrame(() => {
        let name = helpers['1i10ku'].name;

        console.time(name);
        performance.mark(`${name}:start`);

        for (let i = 0; i < 10_000; i++) {
          set(i);
        }

        tryVerify(name, helpers['1i10ku'].verify);
      });
    },
  },
  '10ki1u': {
    name: '10k items, 1 update',
    verify: () => {
      let result = document.querySelector('body').textContent.trim();

      return result.endsWith('9999');
    },
    run: (set) => {
      requestAnimationFrame(() => {
        let name = helpers['10ki1u'].name;

        console.time(name);
        performance.mark(`${name}:start`);

        for (let i = 0; i < 10_000; i++) {
          set(i);
        }

        tryVerify(name, helpers['10ki1u'].verify);
      });
    },
  },
  '10ki1u-25p': {
    name: '10k items, 1 update on 25% of the items',
    verify: () => {
      let result = document
        .querySelector('body')
        .textContent.trim()
        .replaceAll(/\s+/g, ' ');

      let lastValue = helpers['10ki1u-25p'].last;
      /**
       * Include spaces so we don't match 123, when searching for 2
       */
      let target = ` ${lastValue} `;
      console.log(`Looking for ${lastValue} via '${target}'`);
      return result.includes(target);
    },
    run: (set) => {
      requestAnimationFrame(() => {
        let name = helpers['10ki1u-25p'].name;

        // 25% of 10k
        let total = 2500;

        console.time(name);
        performance.mark(`${name}:start`);

        for (let i = 0; i < total; i++) {
          let index = Math.floor(Math.random() * 10_000);
          set(index);
          helpers['10ki1u-25p'].last = index;
        }

        tryVerify(name, helpers['10ki1u-25p'].verify);
      });
    },
  },
};
