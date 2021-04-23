/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useState, useCallback} from 'react';
import {useCurrentScopeName} from '../ui/Tracked';
import {useAssertStableRef} from './useAssertStableRef';

export function useLocalStorageState<T>(
  key: string,
  initialValue: (() => T) | T,
): [T, (newState: T | ((current: T) => T)) => void] {
  useAssertStableRef(key, 'key');
  const scope = useCurrentScopeName();
  const storageKey = `[useLocalStorage][${scope}]${key}`;

  // Based on https://usehooks.com/useLocalStorage/ (with minor adaptions)
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(storageKey);
      // Parse stored json or if none return initialValue
      return item
        ? JSON.parse(item)
        : typeof initialValue === 'function'
        ? (initialValue as any)()
        : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback(
    (value) => {
      setStoredValue((storedValue) => {
        const nextValue =
          typeof value === 'function' ? value(storedValue) : value;
        // Save to local storage
        window.localStorage.setItem(storageKey, JSON.stringify(nextValue));
        return nextValue;
      });
    },
    [storageKey],
  );

  return [storedValue, setValue];
}
