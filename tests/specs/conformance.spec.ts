import { join } from 'node:path';

import { test, expect, type Page } from '@playwright/test';

import { FRAMEWORKS, appDir, serveDist } from '../helpers';

/*
 * Anti-cheating conformance: is every framework doing the same DOM work?
 *
 * The workload is shared (`common`) and seeded, so every framework
 * receives *identical writes*. In the default sync-loop mode frameworks
 * legitimately coalesce those writes differently -- that difference is
 * part of what the benchmark measures, so DOM traces are not comparable
 * there. But the benches already support delivering one update per
 * macrotask (`yield=macro&percentRandomAwait=100`, or `burstSize=1` for
 * fan-out), and in that mode every framework gets a full task between
 * writes: there is nothing left to coalesce, so the sequence of rendered
 * DOM states is fully determined by the workload and must be identical
 * for everyone.
 *
 * A MutationObserver installed before any app code (addInitScript)
 * records:
 *
 * - `states`: the page text after every DOM change inside the measured
 *   window (`:start` .. `:done`), whitespace-stripped and deduplicated.
 *   Compared against the exact expected sequence. This catches:
 *   - skipped updates (coalescing when the workload forbids it)
 *   - out-of-order or extra updates
 *   - pre-rendering the final state before `:start`, or finishing the
 *     work after `:done` was stamped
 * - `churn`: how the updates reach the DOM. Elements must not be added
 *   or removed while the bench runs (every bench's structure is static;
 *   only text changes), and text-node churn is bounded: writing
 *   `nodeValue` in place is 0 nodes, swapping a text node is 2, and
 *   rebuilding a list subtree per update is O(items) -- which is the
 *   cheat/bug this bound exists to catch (see the ember ten-k app's
 *   `key="@index"` comment for a real instance).
 *
 * dbmon-with-chat is excluded: it runs forever off worker-driven timing,
 * so there is no deterministic finite trace to compare.
 *
 * Opt-in via CONFORMANCE=1 so the default `pnpm test` run stays the
 * plain "does every app work" suite:
 *
 *   CONFORMANCE=1 SKIP_BUILD=1 pnpm test specs/conformance.spec.ts
 */

const UPDATES = 30;
const ITEMS = 20;
const CONSUMERS = 10;

interface Churn {
  nodesAdded: number;
  nodesRemoved: number;
  elementsAdded: number;
  elementsRemoved: number;
}

interface Trace {
  states: string[];
  callbacks: number;
  churn: Churn;
}

interface ConformanceSpec {
  app: string;
  query: string;
  /**
   * The exact sequence of page-text states the run must pass through,
   * or null for the self-advancing bench (validated as a strict +1
   * counting sequence instead, because each framework's initial render
   * differs: some start at -1, some at 0, so the first in-window state
   * is 0 or 1).
   */
  expectedStates: string[] | null;
  /**
   * Text-node churn allowed per rendered state. 2 covers frameworks
   * that swap the text node instead of writing `nodeValue` in place;
   * fan-out allows 2 per consumer. A per-update subtree rebuild is
   * O(items) per state and blows well past this.
   */
  maxNodesPerState: number;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * Deviations discovered by running this suite -- documented scheduling
 * asymmetries, not cheats, kept here so they are visible and so any new
 * one has to be added (and reviewed) explicitly.
 *
 * react / fan-out: the first burst-end is written synchronously from
 * the requestIdleCallback that boots the bench, and react's first
 * render consistently lands after the second burst was already applied,
 * so state [1] never reaches the DOM. Every render after that is in
 * lockstep (each carries exactly one state's worth of mutation
 * records). one-item does not hit this because its loop yields *before*
 * the first write, so every write happens inside a task.
 */
const MAY_SKIP_FIRST_STATE: Array<[framework: string, app: string]> = [
  ['react', 'fan-out'],
];

const SPECS: ConformanceSpec[] = [
  {
    app: 'one-item-many-updates',
    query: `?updates=${UPDATES}&percentRandomAwait=100&yield=macro`,
    // the initial render already shows [0] before :start, and set(0)
    // re-renders the same text -- the first observable change is [1]
    expectedStates: range(1, UPDATES).map((i) => `[${i}]`),
    maxNodesPerState: 2,
  },
  {
    app: 'ten-k-items-one-time',
    query: `?items=${ITEMS}&updates=${ITEMS}&percentRandomAwait=100&yield=macro`,
    // sequential updates: state k has items 0..k set, the rest untouched
    expectedStates: range(0, ITEMS).map((k) =>
      range(0, ITEMS)
        .map((i) => `[${i <= k ? i : undefined}]`)
        .join(''),
    ),
    maxNodesPerState: 2,
  },
  {
    app: 'fan-out',
    query: `?consumers=${CONSUMERS}&updates=${UPDATES}&burstSize=1`,
    // bursts of 1: nothing to coalesce, every value must reach every
    // consumer, and consumers must never tear (a state where they
    // disagree would not match)
    expectedStates: range(1, UPDATES + 1).map((v) =>
      `[${v}]`.repeat(CONSUMERS),
    ),
    maxNodesPerState: 2 * CONSUMERS,
  },
  {
    app: 'incrementing-render-effect',
    query: `?updates=${UPDATES}`,
    // self-advancing: the bench itself throws if the DOM ever lags the
    // value, so here we only pin the counting shape and the churn
    expectedStates: null,
    maxNodesPerState: 2,
  },
];

/**
 * Runs before any app code (addInitScript): records every DOM change.
 *
 * Dedup happens against `last` even before `:start`, so a same-text
 * write at the window boundary (e.g. one-item's set(0) re-rendering
 * "[0]") is not misread as the first update by frameworks that write
 * unconditionally, while frameworks that bail on equal values record
 * nothing -- both traces stay identical.
 *
 * This observer is registered before the app's own tryVerify observer,
 * and MutationObserver callbacks fire in registration order, so when
 * tryVerify settles via its own observer the final mutation is recorded
 * here first. When the app reaches tryVerify synchronously instead,
 * `:done` is already stamped by the time this callback runs -- hence
 * record-then-disconnect below rather than bailing on `:done`.
 */
function installTraceObserver() {
  const trace = {
    states: [] as string[],
    callbacks: 0,
    churn: {
      nodesAdded: 0,
      nodesRemoved: 0,
      elementsAdded: 0,
      elementsRemoved: 0,
    },
  };

  (window as unknown as { __conformance: typeof trace }).__conformance = trace;

  let last: string | null = null;

  const marked = (name: string) =>
    performance.getEntriesByName(name, 'mark').length > 0;

  const observer = new MutationObserver((records) => {
    const inWindow = marked(':start');

    if (inWindow) {
      trace.callbacks++;

      for (const record of records) {
        trace.churn.nodesAdded += record.addedNodes.length;
        trace.churn.nodesRemoved += record.removedNodes.length;

        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) trace.churn.elementsAdded++;
        }

        for (const node of record.removedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE)
            trace.churn.elementsRemoved++;
        }
      }
    }

    const text = (document.body?.textContent ?? '').replace(/\s+/g, '');

    if (text !== last) {
      last = text;

      if (inWindow) trace.states.push(text);
    }

    // The batch that carries the final render can be delivered *after*
    // tryVerify stamped `:done`: a framework whose render effect runs
    // synchronously with the flush (incrementing-render-effect's
    // advancer) reaches tryVerify in the same task as the mutation, and
    // this callback is a microtask behind it. So record first, and only
    // then stop observing.
    if (marked(':done')) observer.disconnect();
  });

  // same scope as tryVerify: attributes are how nothing here renders
  observer.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

function expectCountingSequence(states: string[], last: number) {
  const numbers = states.map(Number);

  expect(
    numbers.every((n) => Number.isInteger(n)),
    `every state is an integer: ${states.join(', ')}`,
  ).toBe(true);

  // strict +1 steps: rendering every intermediate value, none twice
  const broken = numbers.filter((n, i) => i > 0 && n !== numbers[i - 1]! + 1);

  expect(broken, 'every step increments by exactly 1').toEqual([]);
  expect(numbers[0], 'starts at the first update').toBeLessThanOrEqual(1);
  expect(numbers.at(-1), 'ends at the final value').toBe(last);
}

async function runConformance(
  page: Page,
  framework: string,
  spec: ConformanceSpec,
) {
  const server = await serveDist(join(appDir(framework, spec.app), 'dist'));

  try {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));

    await page.addInitScript(installTraceObserver);
    await page.goto(`${server.url}/${spec.query}`);

    await page.waitForFunction(
      () => performance.getEntriesByName(':done', 'mark').length > 0,
      undefined,
      { timeout: 60_000 },
    );

    const trace = (await page.evaluate(
      () => (window as unknown as { __conformance: Trace }).__conformance,
    )) as Trace;

    await test.info().attach(`${framework}-${spec.app}-trace`, {
      body: JSON.stringify(trace, null, 2),
      contentType: 'application/json',
    });

    expect(errors, 'no uncaught errors on the page').toEqual([]);

    if (spec.expectedStates) {
      const maySkipFirst = MAY_SKIP_FIRST_STATE.some(
        ([fw, app]) => fw === framework && app === spec.app,
      );
      const expected =
        maySkipFirst && trace.states.length === spec.expectedStates.length - 1
          ? spec.expectedStates.slice(1)
          : spec.expectedStates;

      expect(trace.states, 'rendered exactly the expected states').toEqual(
        expected,
      );
    } else {
      expectCountingSequence(trace.states, UPDATES);
    }

    expect(
      trace.churn.elementsAdded,
      'no elements created while the bench runs',
    ).toBe(0);
    expect(
      trace.churn.elementsRemoved,
      'no elements destroyed while the bench runs',
    ).toBe(0);

    const nodeBudget = trace.states.length * spec.maxNodesPerState;

    expect(
      trace.churn.nodesAdded,
      `text-node churn within budget (${nodeBudget})`,
    ).toBeLessThanOrEqual(nodeBudget);
    expect(
      trace.churn.nodesRemoved,
      `text-node churn within budget (${nodeBudget})`,
    ).toBeLessThanOrEqual(nodeBudget);
  } finally {
    await server.close();
  }
}

test.describe('conformance (anti-cheating)', () => {
  test.skip(
    () => !process.env['CONFORMANCE'],
    'opt-in: CONFORMANCE=1 SKIP_BUILD=1 pnpm test specs/conformance.spec.ts',
  );

  for (const framework of FRAMEWORKS) {
    for (const spec of SPECS) {
      test(`${framework} / ${spec.app}`, async ({ page }) => {
        await runConformance(page, framework, spec);
      });
    }
  }
});
