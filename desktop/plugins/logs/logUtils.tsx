/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function getLineCount(str: string): number {
  let count = 1;
  if (!(typeof str === 'string')) {
    return 0;
  }
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') {
      count++;
    }
  }
  return count;
}

export function pad(chunk: any, len: number): string {
  let str = String(chunk);
  while (str.length < len) {
    str = `0${str}`;
  }
  return str;
}
