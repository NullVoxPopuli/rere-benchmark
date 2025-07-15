let isRunning = false;

const state = Symbol.for('worker:state');

addEventListener('message', function handleMessage(event) {
  let data = JSON.parse(event.data);
  switch (data.action) {
    case 'start': {
      if (isRunning) throw new Error(`Worker is already started`);

      globalThis[state] ||= {
        search: data.search,
      };
      start();

      return;
    }
    default:
      console.log(`Unandled event`, event);
  }
});

import { generateData } from './env.js';

function start() {
  isRunning = true;

  let data = generateData();

  // initial data
  postMessage({
    type: 'json',
    when: 'initial',
    data: data.toArray(),
  });

  async function loop() {
    let delay = Math.random() * 5;
    await new Promise((resolve) => setTimeout(resolve, delay));

    let changed = data.updateData();

    // TODO: only post what changed
    postMessage({
      type: 'json',
      when: 'update',
      data: changed,
    });
    loop();
  }

  loop();
}
