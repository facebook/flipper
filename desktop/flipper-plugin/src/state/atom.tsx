/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {_AtomValue, _ReadOnlyAtom} from 'flipper-plugin-core';
import {useState, useEffect} from 'react';

export function useValue<T>(atom: _ReadOnlyAtom<T>): T;
export function useValue<T>(
  atom: _ReadOnlyAtom<T> | undefined,
  defaultValue: T,
): T;
export function useValue<T>(
  atom: _ReadOnlyAtom<T> | undefined,
  defaultValue?: T,
): T {
  const [localValue, setLocalValue] = useState<T>(
    atom ? atom.get() : defaultValue!,
  );
  useEffect(() => {
    if (!atom) {
      return;
    }
    // atom might have changed between mounting and effect setup
    // in that case, this will cause a re-render, otherwise not
    setLocalValue(atom.get());
    (atom as _AtomValue<T>).subscribe(setLocalValue);
    return () => {
      (atom as _AtomValue<T>).unsubscribe(setLocalValue);
    };
  }, [atom]);
  return localValue;
}
