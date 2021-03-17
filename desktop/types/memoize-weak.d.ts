/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'memoize-weak' {
  export default function memoize<T extends (...args: any) => any>(
    fn: T,
  ): T & {
    clear(...args: Parameters<T> | []): void;
  };
}
