/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {State, Store} from '../reducers/index';

export async function waitFor(
  store: Store,
  predicate: (state: State) => boolean,
): Promise<void> {
  if (predicate(store.getState())) {
    return;
  }
  return new Promise<void>((resolve) => {
    const unsub = store.subscribe(() => {
      if (predicate(store.getState())) {
        unsub();
        resolve();
      }
    });
  });
}
