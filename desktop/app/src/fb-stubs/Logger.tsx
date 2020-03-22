/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, Args} from '../fb-interfaces/Logger';
import StubLogger from '../utils/StubLogger';
import {Store} from '../reducers/index';

let instance: StubLogger | null = null;

export function init(store: Store, _args?: Args): Logger {
  if (instance) {
    throw new Error('Attempted to initialize Logger when already initialized');
  }
  instance = new StubLogger(store);
  return instance;
}

export function getInstance(): Logger {
  if (!instance) {
    throw new Error(
      'Requested Logger instance without initializing it. Make sure init() is called at app start',
    );
  }
  return instance;
}
