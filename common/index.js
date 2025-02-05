function tryVerify(label, check, remainingAttempts = 10) {
  if (check()) {
    console.timeEnd(label);
    performance.mark(`${label}:done`);
    return;
  }

  if (remainingAttempts > 0) {
    requestAnimationFrame(() => {
      tryVerify(label, check, remainingAttempts - 1);
    })
    return;
  }

  throw new Error(`Could not determine verified state within 10 frames`);
}

export const helpers = {
  '1i10ku': {
    name: '1 Item, 10k updates',
    verify: () => {
      let result = document.querySelector('output').textContent;

      return (result !== '9999');
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
      })
    }
  },
  '10ki1u': {
    name: '10k items, 1 update',
    run: (set) => {
    },
  }
}

