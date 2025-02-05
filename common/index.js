export const helpers = {
  '1i10ku': {
    name: '1 Item, 10k updates',
    verify: () => {
      let result = document.querySelector('output').textContent;

      if (result !== '9999') {
        throw new Error('Animation frame occurred before iteration finished');
      }
    },
    run: (set) => {
      requestAnimationFrame(() => {
        let name = helpers['1i10ku'].name;

        console.time(name);
        performance.mark(`${name}:start`);

        for (let i = 0; i < 10_000; i++) {
          set(i);
        }

        requestAnimationFrame(() => {
          console.timeEnd(name);
          helpers['1i10ku'].verify();

          performance.mark(`${name}:done`);
        });

      })
    }
  },
  '10ki1u': {
    name: '10k items, 1 update',
    run: (set) => {
    },
  }
}

