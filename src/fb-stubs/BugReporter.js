/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Logger} from '../fb-interfaces/Logger';

import type {Store} from '../reducers/index.js';

export default class BugReporter {
  constructor(logManager: Logger, store: Store) {}
  async report(title: string, body: string): Promise<number> {
    return Promise.resolve(-1);
  }
}
