/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger, LoggerArgs, NoopLogger} from 'flipper-common';
import {Store} from '../reducers/index';

export function init(_store: Store, _args?: LoggerArgs): Logger {
  return new NoopLogger();
}
