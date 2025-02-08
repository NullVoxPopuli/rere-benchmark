import { dataOf } from './components/reshape.ts';
import { Visualize } from './components/visualize.gts';

<template>
  Tested on 2025-02-07 on
  <ul>
    <li>Ubuntu 24.04 w/ AMD Ryzen 9 7900X / 64GB RAM</li>
    <li>Google Chrome 133.0.6943.53 (non-headless)</li>
    <li>240hz Monitor (1 frame = 4.17ms)</li>
  </ul>

  <div class="all-results">
    <Visualize
      @name="1 item, 10k updates"
      @results={{dataOf "one-item-10k-times"}}
    />
    <Visualize
      @name="10k items, 1 update each (sequential)"
      @results={{dataOf "ten-k-items-one-time"}}
    />
  </div>
</template>
