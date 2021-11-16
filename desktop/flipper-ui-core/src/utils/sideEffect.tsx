/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store as ReduxStore} from 'redux';
import {shallowEqual} from 'react-redux';

/**
 * Registers a sideEffect for the given redux store. Use this utility rather than subscribing to the Redux store directly, which fixes a few problems:
 * 1. It decouples and throttles the effect so that no arbitrary expensive burden is added to every store update.
 * 2. It makes sure that a crashing side effect doesn't crash the entire store update.
 * 3. It helps with tracing and monitoring perf problems.
 * 4. It puts the side effect behind a selector so that the side effect is only triggered if a relevant part of the store changes, like we do for components.
 *
 * @param store
 * @param options
 * @param selector
 * @param effect
 */
export function sideEffect<
  Store extends ReduxStore<any, any>,
  V,
  State = Store extends ReduxStore<infer S, any> ? S : never,
>(
  store: Store,
  options: {
    name: string;
    throttleMs: number;
    fireImmediately?: boolean;
    noTimeBudgetWarns?: boolean;
    runSynchronously?: boolean;
  },
  selector: (state: State) => V,
  effect: (selectedState: V, store: Store) => void,
): () => void {
  let scheduled = false;
  let lastRun = -1;
  let lastSelectedValue: V = selector(store.getState());
  let timeout: NodeJS.Timeout;

  function run() {
    scheduled = false;
    const start = performance.now();
    try {
      // Future idea: support effects that return promises as well
      lastSelectedValue = selector(store.getState());
      effect(lastSelectedValue, store);
    } catch (e) {
      console.error(
        `Error while running side effect '${options.name}': ${e}`,
        e,
      );
    }
    lastRun = performance.now();
    const duration = lastRun - start;
    if (
      !options.noTimeBudgetWarns &&
      duration > 15 &&
      duration > options.throttleMs / 10
    ) {
      console.warn(
        `Side effect '${options.name}' took ${Math.round(
          duration,
        )}ms, which exceeded its budget of ${Math.floor(
          options.throttleMs / 10,
        )}ms. Please make the effect faster or increase the throttle time.`,
      );
    }
  }

  const unsubscribe = store.subscribe(() => {
    if (scheduled) {
      return;
    }
    const newValue = selector(store.getState());
    if (
      newValue === lastSelectedValue ||
      shallowEqual(newValue, lastSelectedValue)
    ) {
      return; // no new value, no need to schedule
    }
    scheduled = true;
    if (options.runSynchronously) {
      run();
    } else {
      timeout = setTimeout(
        run,
        // Run ASAP (but async) or, if we recently did run, delay until at least 'throttle' time has expired
        lastRun === -1
          ? 1
          : Math.max(1, lastRun + options.throttleMs - performance.now()),
      );
    }
  });

  if (options.fireImmediately) {
    run();
  }

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}
