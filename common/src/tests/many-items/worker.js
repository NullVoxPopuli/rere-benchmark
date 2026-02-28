let isRunning = false;

const state = {
  num: -1,
  totalUpdates: -1,
  random: false,
  percentRandomAwait: -1,
  allowManualBatch: false,
};

addEventListener('message', function handleMeessage(event) {
  let data = JSON.parse(event.data);
  switch (data.action) {
    case 'start': {
      if (isRunning) throw new Error(`Worker is already started`);

      Object.assign(state, data.options, {
        search: data.search,
      });
      start();

      return;
    }
    default:
      console.log(`Unandled event`, event);
  }
});

function randomNextValue() {
  return Math.floor(Math.random() * state.num);
}

async function start() {
  isRunning = true;
  let delay = 100;

  postMessage({
    type: 'json',
    when: 'initial',
    data: Array(state.num).fill(undefined),
  });

  const label = 'emitting data';
  console.time(label);

  await new Promise((resolve) => setTimeout(resolve, delay));

  for (let i = 0; i < state.totalUpdates; i++) {
    let nextValue = state.random ? randomNextValue() : i;

    postMessage(nextValue, [nextValue]);
  }

  console.timeEnd(label);

  postMessage({
    type: 'json',
    when: 'finish',
  });
}
