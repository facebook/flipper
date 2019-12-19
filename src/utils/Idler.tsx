/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CancelledPromiseError} from './errors';
import {sleep} from './promiseTimeout';

export interface BaseIdler {
  shouldIdle(): boolean;
  idle(): Promise<void>;
  cancel(): void;
}

export class Idler implements BaseIdler {
  lastIdle = performance.now();
  interval = 16;
  kill = false;

  shouldIdle(): boolean {
    return this.kill || performance.now() - this.lastIdle > this.interval;
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

// This smills like we should be using generators :)
export class TestIdler implements BaseIdler {
  resolver?: () => void;
  kill = false;
  autoRun = false;
  hasProgressed = false;

  shouldIdle() {
    if (this.kill) {
      return true;
    }
    if (this.autoRun) {
      return false;
    }
    // In turn we signal idle is needed and that it isn't
    this.hasProgressed = !this.hasProgressed;
    return !this.hasProgressed;
  }

  async idle() {
    if (this.kill) {
      throw new CancelledPromiseError('Idler got killed');
    }
    if (this.autoRun) {
      return undefined;
    }
    if (this.resolver) {
      throw new Error('Already idling');
    }
    return new Promise<void>(resolve => {
      this.resolver = () => {
        this.resolver = undefined;
        // this.hasProgressed = false;
        resolve();
      };
    });
  }

  cancel() {
    this.kill = true;
    this.run();
  }

  async next() {
    if (!this.resolver) {
      throw new Error('Not yet idled');
    }

    this.resolver();
    // make sure waiting promise runs first
    await sleep(10);
  }

  /**
   * Automatically progresses through all idle calls
   */
  run() {
    this.resolver?.();
    this.autoRun = true;
  }
}
