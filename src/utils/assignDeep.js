/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

function isObject(val: mixed): boolean {
  return (
    Boolean(val) &&
    typeof val === 'object' &&
    Object.prototype.toString.call(val) === '[object Object]'
  );
}

export default function assignDeep<T: Object>(
  base: T,
  ...reduces: Array<Object>
): T {
  base = Object.assign({}, base);

  for (const reduce of reduces) {
    for (const key in reduce) {
      const baseVal = base[key];
      const val = reduce[key];

      if (isObject(val) && isObject(baseVal)) {
        base[key] = assignDeep(baseVal, val);
      } else if (typeof val === 'undefined') {
        delete base[key];
      } else {
        base[key] = val;
      }
    }
  }

  return base;
}
