/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// https://github.com/microsoft/TypeScript/issues/36931#issuecomment-846131999
type Assert = (condition: unknown) => asserts condition;
export const assert: Assert = (condition) => {
  if (!condition) {
    throw new Error();
  }
};

export const safeJSONStringify = (data: unknown): string => {
  try {
    return JSON.stringify(data);
  } catch {
    return 'Unable to serialize';
  }
};

export const isPromise = (val: unknown): val is Promise<unknown> =>
  typeof val === 'object' &&
  val !== null &&
  typeof (val as Promise<unknown>).then === 'function' &&
  typeof (val as Promise<unknown>).catch === 'function';

// TODO: Share types wiht desktop
type OS =
  | 'iOS'
  | 'Android'
  | 'Metro'
  | 'Windows'
  | 'MacOS'
  | 'Browser'
  | 'Linux';

// https://stackoverflow.com/a/31456668
const detectDeviceType = () =>
  typeof process === 'object' &&
  typeof process.versions === 'object' &&
  typeof process.versions.node !== 'undefined'
    ? 'Node.js'
    : 'Browser';
export const detectOS = (): OS => {
  if (detectDeviceType() === 'Browser') {
    return 'Browser';
  }
  switch (require('os').type()) {
    case 'Linux':
      return 'Linux';
    case 'Darwin':
      return 'MacOS';
    default:
      return 'Windows';
  }
};

export const detectDevice = (): string => {
  if (detectDeviceType() === 'Browser') {
    return window.navigator.userAgent;
  }
  return require('os').release();
};
