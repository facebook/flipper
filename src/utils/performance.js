/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
