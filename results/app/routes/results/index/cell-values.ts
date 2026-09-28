import { interpolate } from "culori";

import { DEFAULT_CURVE } from "#utils";

const worst = "#ff7777";
const best = "#77ff77";

/** green at 0, red at 1, so the ramp is always indexed by distance from the best value */
const gradient = interpolate([best, worst], "oklch");

/**
 * Where a value sits on the gradient, given how far it is from the row's
 * best result as a fraction of the row's spread.
 *
 * Spending that distance linearly hands the whole scale to the slowest framework.
 * When the worst result is 20x the best,
 * everything within 2x of the winner lands on the same green.
 * Bending it logarithmically gives the close race at the top more of the colors,
 * and lets the tail share the red.
 *
 * `curve` is how hard it bends:
 * - 0 is the straight linear ramp
 * - positive spends more of the gradient on the results nearest the best one
 * - negative does the same for the ones nearest the worst
 *
 * Every real number lands somewhere useful, so the setting takes anything.
 */
function rampFromBest(distance: number, curve: number): number {
  if (curve === 0) return distance;
  // bending away from best is the same curve read from the other end.
  // Feeding a negative straight to log1p would go imaginary past -1.
  if (curve < 0) return 1 - rampFromBest(1 - distance, -curve);

  return Math.log1p(curve * distance) / Math.log1p(curve);
}

export function colorFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  reverse = false,
  curve = DEFAULT_CURVE,
) {
  if (!speed || !min || !max) return;

  const normalized = (speed - min) / (max - min);
  const color = gradient(rampFromBest(reverse ? 1 - normalized : normalized, curve));

  return `oklch(${color.l} ${color.c} ${color.h}deg)`;
}

/**
 * The same normalization the cell colors use, as a displayable value.
 */
export function scoreFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (max === min) return (1).toFixed(2);

  return ((speed - min) / (max - min)).toFixed(2);
}

/**
 * How many times worse than the row's best this value is:
 * 1 for the best, 1.1 for 10% worse, etc.
 * Always >= 1 regardless of direction.
 */
export function timesBestFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  bestIsMax: boolean,
) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (speed <= 0 || min <= 0) return;

  return bestIsMax ? max / speed : speed / min;
}

export function formatTimes(ratio: number) {
  return `${Math.round(ratio * 100) / 100}x`;
}
