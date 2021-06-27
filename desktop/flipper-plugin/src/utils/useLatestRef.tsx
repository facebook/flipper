/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect, useRef} from 'react';

/**
 * Creates a ref object that is always synced from the value passed in.
 */
export function useLatestRef<T>(latest: T): {readonly current: T} {
  const latestRef = useRef(latest);

  // TODO: sync eagerly (in render) or late? Introduce a `syncEarly` flag as second arg
  useEffect(() => {
    latestRef.current = latest;
  }, [latest]);

  return latestRef;
}
