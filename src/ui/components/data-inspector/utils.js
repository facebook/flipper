/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const naturalCompare = require('string-natural-compare');

export function getSortedKeys(obj: Object): Array<string> {
  return Object.keys(obj).sort(naturalCompare);
}
