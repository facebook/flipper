/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect, useRef, useState} from 'react';

const NoValue = Symbol('no-value');

/**
 * this allows us to update the inputs with the result of the change optimistically
 * for period of time, after we assume the change was unsucessfull and fallback to the client value
 */
export function useOptimisticValue<T>(
  clientValue: T,
  onChange: (value: T) => void,
) {
  const [optimisticValue, setOptimisticValue] = useState<T | typeof NoValue>(
    NoValue,
  );
  const timeoutHandle = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutHandle.current) {
        clearTimeout(timeoutHandle.current);
      }
    };
  }, []);

  return {
    onChange: (value: T) => {
      setOptimisticValue(value);

      onChange(value);

      if (timeoutHandle.current) {
        clearTimeout(timeoutHandle.current);
      }

      timeoutHandle.current = setTimeout(() => {
        //only keep optimistic value for TTL
        setOptimisticValue(NoValue);
        timeoutHandle.current = undefined;
      }, TTL);
    },
    value: optimisticValue === NoValue ? clientValue : optimisticValue,
    pending: !(optimisticValue === NoValue || optimisticValue === clientValue),
  };
}

const TTL = 1000;
