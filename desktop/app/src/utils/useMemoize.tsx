/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useMemo} from 'react';

/**
 * Slight variation on useMemo that encourages to create hoistable memoization functions,
 * which encourages reuse and testability by no longer closing over things in the memoization function.
 *
 * @example
 * const metroDevice = useMemoize(
 *   findMetroDevice,
 *   [connections.devices],
 * );
 */
export function useMemoize<T extends any[], R>(fn: (...args: T) => R, args: T) {
  // eslint-disable-next-line
  return useMemo(() => fn.apply(null, args), args);
}
