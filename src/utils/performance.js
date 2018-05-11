/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

let debugId = 0;

export function mark(): string {
  const id = String(debugId++);
  if (typeof performance === 'object') {
    performance.mark(id);
  }
  return id;
}

export function measure(id: string, name: string) {
  if (typeof performance === 'object') {
    performance.measure(name, id);
    performance.clearMeasures(id);
    performance.clearMarks(id);
  }
}
