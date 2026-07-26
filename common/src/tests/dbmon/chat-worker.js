let isRunning = false;

import { DEFAULT_SEED, globalState, qpNum, seededRandom } from '../utils.js';

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

import { faker } from '@faker-js/faker';

function start() {
  isRunning = true;

  // faker has its own generator, and unseeded it hands every framework
  // different names and different message lengths -- which is different text
  // to lay out, on the bench that measures frame rate
  faker.seed(qpNum('seed', DEFAULT_SEED));

  const random = seededRandom();

  // initial data
  postMessage({
    type: 'json',
    when: 'initial',
    data: [],
  });

  async function loop() {
    let delay = random() * 100;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // TODO: only post what changed
    postMessage({
      type: 'json',
      when: 'update',
      data: [
        {
          author: faker.internet.username(),
          message: faker.hacker.phrase(),
        },
      ],
    });
    loop();
  }

  loop();
}
