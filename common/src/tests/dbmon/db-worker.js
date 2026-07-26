let isRunning = false;

import { globalState, seededRandom } from '../utils.js';

addEventListener('message', function handleMessage(event) {
  let data = JSON.parse(event.data);
  switch (data.action) {
    case 'start': {
      if (isRunning) throw new Error(`Worker is already started`);

      globalState().search ??= data.search;
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

  // seeded here rather than at module scope: the page's query string, and so
  // the seed, only arrives with the start message
  const random = seededRandom();
  let data = generateData();

  // initial data
  postMessage({
    type: 'json',
    when: 'initial',
    data: data.toArray(),
  });

  async function loop() {
    let delay = random() * 15;
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
