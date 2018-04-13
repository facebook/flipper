/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

const naturalCompare = require('string-natural-compare');

export function getSortedKeys(obj: Object): Array<string> {
  return Object.keys(obj).sort(naturalCompare);
}
