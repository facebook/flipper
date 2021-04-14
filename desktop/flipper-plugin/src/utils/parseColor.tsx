/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function parseColor(
  val: string | number,
):
  | {
      r: number;
      g: number;
      b: number;
      a: number;
    }
  | undefined
  | null {
  if (typeof val === 'number') {
    const a = ((val >> 24) & 0xff) / 255;
    const r = (val >> 16) & 0xff;
    const g = (val >> 8) & 0xff;
    const b = val & 0xff;
    return {a, b, g, r};
  }
  if (typeof val !== 'string') {
    return;
  }
  if (val[0] !== '#') {
    return;
  }

  // remove leading hash
  val = val.slice(1);

  // only allow RGB and ARGB hex values
  if (val.length !== 3 && val.length !== 6 && val.length !== 8) {
    return;
  }

  // split every 2 characters
  const parts = val.match(/.{1,2}/g);
  if (!parts) {
    return;
  }

  // get the alpha value
  let a = 1;

  // extract alpha if passed AARRGGBB
  if (val.length === 8) {
    a = parseInt(parts.shift() || '0', 16) / 255;
  }

  const size = val.length;
  const [r, g, b] = parts.map((num) => {
    if (size === 3) {
      return parseInt(num + num, 16);
    } else {
      return parseInt(num, 16);
    }
  });

  return {a, b, g, r};
}
