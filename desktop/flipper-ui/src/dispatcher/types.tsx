/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from 'flipper-common';

export type Dispatcher = (
  store: Store,
  logger: Logger,
) => (() => Promise<void>) | null | void;
