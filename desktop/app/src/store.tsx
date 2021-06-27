/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import './global';
import {createStore} from 'redux';
import {
  createRootReducer,
  Actions,
  State as StoreState,
  Store,
} from './reducers/index';
import {stateSanitizer} from './utils/reduxDevToolsConfig';
import isProduction from './utils/isProduction';

let store: Store;

function initStore() {
  const rootReducer = createRootReducer();

  store = createStore<StoreState, Actions, any, any>(
    rootReducer,
    // @ts-ignore Type definition mismatch
    window.__REDUX_DEVTOOLS_EXTENSION__
      ? window.__REDUX_DEVTOOLS_EXTENSION__({
          // @ts-ignore: stateSanitizer is not part of type definition.
          stateSanitizer,
        })
      : undefined,
  );

  if (!isProduction()) {
    // For debugging purposes only
    // @ts-ignore
    window.flipperStore = store;
  }
  return store;
}

// grab store lazily, to not break module loading order...
export function getStore() {
  if (!store) {
    return initStore();
  }
  return store;
}
