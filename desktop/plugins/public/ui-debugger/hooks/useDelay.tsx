/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect, useRef, useState} from 'react';

export function useDelay(delayTimeMs: number) {
  const [isDone, setIsDone] = useState(false);
  const delayTimerStarted = useRef(false);
  useEffect(() => {
    let handle: NodeJS.Timeout | null = null;
    if (delayTimerStarted.current === false) {
      handle = setTimeout(() => setIsDone(true), delayTimeMs);
      delayTimerStarted.current = true;
    }

    return () => {
      if (handle !== null) {
        clearTimeout(handle);
      }
    };
  }, [delayTimeMs]);

  return isDone;
}
