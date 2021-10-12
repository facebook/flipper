/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, LoggerArgs} from 'flipper-common';
import StubLogger from '../utils/StubLogger';
import {Store} from '../reducers/index';

let instance: StubLogger | null = null;

export function init(store: Store, _args?: LoggerArgs): Logger {
  if (instance) {
    throw new Error('Attempted to initialize Logger when already initialized');
  }
  instance = new StubLogger(store, _args);
  return instance;
}

export function getInstance(): Logger {
  if (!instance) {
    return init(undefined as any /* store is not actually used */);
  }
  return instance;
}
