/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger} from '../fb-interfaces/Logger';
import {Store} from '../reducers/index';

export default class BugReporter {
  constructor(logManager: Logger, store: Store) {}
  async report(title: string, body: string): Promise<number> {
    return Promise.resolve(-1);
  }
}
