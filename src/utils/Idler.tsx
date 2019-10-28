/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CancelledPromiseError} from './errors';

export class Idler {
  lastIdle: number;
  interval: number;
  kill: boolean;

  constructor() {
    this.lastIdle = 0;
    this.interval = 3;
    this.kill = false;
  }

  idle(): Promise<void> {
    if (this.kill) {
      throw new CancelledPromiseError('Idler got killed');
    }
    const now = performance.now();
    if (now - this.lastIdle > this.interval) {
      this.lastIdle = now;
      return new Promise(resolve => setTimeout(resolve, 0));
    }
    return Promise.resolve();
  }

  cancel() {
    this.kill = true;
  }
}
