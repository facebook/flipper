/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

import RemoteDevice from '../devices/RemoteDevice';

export default (store: Store, logger: Logger) => {
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: new RemoteDevice(),
  });
};
