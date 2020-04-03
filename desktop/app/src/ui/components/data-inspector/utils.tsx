/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import naturalCompare from 'string-natural-compare';

export function getSortedKeys(obj: Object): Array<string> {
  return Object.keys(obj).sort(naturalCompare);
}
