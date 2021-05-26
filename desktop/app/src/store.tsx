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
import reducers, {Actions, State as StoreState, Store} from './reducers/index';
import {stateSanitizer} from './utils/reduxDevToolsConfig';
import isProduction from './utils/isProduction';
import {_SandyPluginDefinition} from 'flipper-plugin';

export const store: Store = createStore<StoreState, Actions, any, any>(
  rootReducer,
  // @ts-ignore Type definition mismatch
  window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__({
        // @ts-ignore: stateSanitizer is not part of type definition.
        stateSanitizer,
      })
    : undefined,
);

export function rootReducer(
  state: StoreState | undefined,
  action: Actions,
): StoreState {
  return reducers(state, action);
}

if (!isProduction()) {
  // For debugging purposes only
  // @ts-ignore
  window.flipperStore = store;
}
