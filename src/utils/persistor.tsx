/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Persistor} from 'redux-persist';

let _persistor: Persistor | null = null;

export function setPersistor(persistor: Persistor) {
  _persistor = persistor;
}

export function flush(): Promise<void> {
  return _persistor
    ? _persistor.flush()
    : Promise.reject(new Error('Persistor not set.'));
}
