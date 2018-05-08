/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import androidDevice from './androidDevice';
import iOSDevice from './iOSDevice';
import application from './application';
import type {Store} from '../reducers/index.js';

export default (store: Store) =>
  [application, androidDevice, iOSDevice].forEach(fn => fn(store));
