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

import { faker } from '@faker-js/faker';

function start() {
  isRunning = true;

  // initial data
  postMessage({
    type: 'json',
    when: 'initial',
    data: [],
  });

  async function loop() {
    let delay = Math.random() * 100;
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
