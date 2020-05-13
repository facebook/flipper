/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createStore} from 'redux';
import reducers, {Actions, State as StoreState} from './reducers/index';
import {stateSanitizer} from './utils/reduxDevToolsConfig';
import isProduction from './utils/isProduction';

export const store = createStore<StoreState, Actions, any, any>(
  reducers,
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
