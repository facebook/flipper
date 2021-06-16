/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useCallback} from 'react';
import {useLatestRef} from './useLatestRef';

/**
 * This hook can be used to avoid forcing consumers of a component to wrap their callbacks
 * in useCallback, by creating wrapper callback that redirects to the lastest prop passed in.
 *
 * Use this hook if you would like to avoid that passing a new callback to this component,
 * will cause child components to rerender when the callback is passed further down.
 *
 * Use it like: `const onSelect = useMakeStableCallback(props.onSelect)`.
 * @param fn
 */
export function useMakeStableCallback<
  T extends undefined | ((...args: any[]) => any),
>(fn: T): T {
  const latestFn = useLatestRef(fn);

  return useCallback(
    (...args: any[]) => {
      return latestFn.current?.apply(null, args);
    },
    [latestFn],
  ) as any;
}
