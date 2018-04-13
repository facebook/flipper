/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {remote} from 'electron';
import type {Store} from '../reducers/index.js';

export default (store: Store) => {
  const currentWindow = remote.getCurrentWindow();
  currentWindow.on('focus', () =>
    store.dispatch({
      type: 'windowIsFocused',
      payload: true,
    }),
  );
  currentWindow.on('blur', () =>
    store.dispatch({
      type: 'windowIsFocused',
      payload: false,
    }),
  );
};
