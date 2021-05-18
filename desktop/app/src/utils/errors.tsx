/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export class CancelledPromiseError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'CancelledPromiseError';
  }
}

export function isError(obj: any): obj is Error {
  return (
    obj instanceof Error ||
    (obj.name &&
      typeof obj.name === 'string' &&
      obj.message &&
      typeof obj.message === 'string' &&
      obj.stack &&
      typeof obj.stack === 'string')
  );
}

export function getErrorFromErrorLike(e: any): Error | undefined {
  if (Array.isArray(e)) {
    return e.map(getErrorFromErrorLike).find((x) => x);
  } else if (isError(e)) {
    return e;
  } else {
    return undefined;
  }
}

export function getStringFromErrorLike(e: any): string {
  if (Array.isArray(e)) {
    return e.map(getStringFromErrorLike).join(' ');
  } else if (typeof e == 'string') {
    return e;
  } else if (isError(e)) {
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
