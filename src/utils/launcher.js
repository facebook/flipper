/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ProcessConfig} from './processConfig.js';
import type {Store} from '../reducers/index.js';

export function initLauncherHooks(config: ProcessConfig, store: Store) {
  // TODO(T40488739): This must be replaced with a proper display before launching this.
  if (config.launcherMsg) {
    store.dispatch({
      type: 'SERVER_ERROR',
      payload: config.launcherMsg,
    });
  }
}
