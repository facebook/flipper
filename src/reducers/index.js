/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {combineReducers} from 'redux';
import application from './application.js';
import devices from './devices.js';
import type {
  State as ApplicationState,
  Action as ApplicationAction,
} from './application.js';
import type {
  State as DevicesState,
  Action as DevicesAction,
} from './devices.js';
import type {Store as ReduxStore} from 'redux';

export type Store = ReduxStore<
  {
    application: ApplicationState,
    devices: DevicesState,
  },
  ApplicationAction | DevicesAction,
>;

export default combineReducers({application, devices});
