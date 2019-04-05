/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ProcessConfig} from './processConfig.js';
import type {Store} from '../reducers/index.js';

export function initLauncherHooks(config: ProcessConfig, store: Store) {
  if (config.launcherMsg) {
    store.dispatch({
      type: 'LAUNCHER_MSG',
      payload: {
        severity: 'warning',
        message: config.launcherMsg,
      },
    });
  }
}
