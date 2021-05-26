/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function getStringFromErrorLike(e: any): string {
  if (Array.isArray(e)) {
    return e.map(getStringFromErrorLike).join(' ');
  } else if (typeof e == 'string') {
    return e;
  } else if (e instanceof Error) {
    return e.message || e.toString();
  } else {
    try {
      return JSON.stringify(e);
    } catch (e) {
      // Stringify might fail on arbitrary structures
      // Last resort: toString it.
      return '' + e;
    }
  }
}
