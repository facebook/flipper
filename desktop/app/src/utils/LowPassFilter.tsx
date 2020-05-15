/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import invariant from 'invariant';

export default class LowPassFilter {
  constructor(smoothing: number = 0.9) {
    this.smoothing = smoothing;
    this.buffer = [];
    this.bufferMaxSize = 5;
  }

  bufferMaxSize: number;
  smoothing: number;
  buffer: Array<number>;

  hasFullBuffer(): boolean {
    return this.buffer.length === this.bufferMaxSize;
  }

  push(value: number): number {
    let removed: number = 0;

    if (this.hasFullBuffer()) {
      const tmp: number | undefined = this.buffer.shift();
      invariant(
        tmp !== undefined,
        'Invariant violation: Buffer reported full but shift returned nothing.',
      );
      removed = tmp;
    }

    this.buffer.push(value);

    return removed;
  }

  next(nextValue: number): number {
    // push new value to the end, and remove oldest one
    const removed = this.push(nextValue);

    // smooth value using all values from buffer
    const result = this.buffer.reduce(this._nextReduce, removed);

    // replace smoothed value
    this.buffer[this.buffer.length - 1] = result;

    return result;
  }

  _nextReduce = (last: number, current: number): number => {
    return this.smoothing * current + (1 - this.smoothing) * last;
  };
}
