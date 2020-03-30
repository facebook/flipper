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
  isCancelled(): boolean;
}

export class Idler implements BaseIdler {
  private lastIdle = performance.now();
  private kill = false;

  constructor(private interval = 16) {}

  shouldIdle(): boolean {
    return this.kill || performance.now() - this.lastIdle > this.interval;
  }

  async idle(): Promise<void> {
    if (this.kill) {
      throw new CancelledPromiseError('Idler got killed');
    }
    const now = performance.now();
    if (now - this.lastIdle > this.interval) {
      this.lastIdle = now;
      return new Promise((resolve) => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            resolve();
          });
        } else {
          setTimeout(resolve, 0);
        }
      });
    }
    return undefined;
  }

  cancel() {
    this.kill = true;
  }

  isCancelled() {
    return this.kill;
  }
}

// This smills like we should be using generators :)
export class TestIdler implements BaseIdler {
  private resolver?: () => void;
  private kill = false;
  private autoRun = false;
  private hasProgressed = false;

  shouldIdle() {
    if (this.kill) {
      return true;
    }
    if (this.autoRun) {
      return false;
    }
    // In turns we signal that idling is needed and that it isn't
    if (!this.hasProgressed) {
      this.hasProgressed = true;
      return false;
    }
    return true;
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
    return new Promise<void>((resolve) => {
      this.resolver = () => {
        this.resolver = undefined;
        this.hasProgressed = false;
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

  isCancelled() {
    return this.kill;
  }
}
