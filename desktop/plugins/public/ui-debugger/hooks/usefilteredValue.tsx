/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Atom} from 'flipper-plugin';
import {useEffect, useState} from 'react';

/**
 * A hook similar to useValue that Subscribes to an atom and returns the current value.
 * However the value only updates if the predicate passes.
 *
 * Usefull for skipping expensive react renders if an update doesnt concern you
 * @param atom
 * @param predicate
 */
export function useFilteredValue<T>(
  atom: Atom<T>,
  predicate: (newValue: T, prevValue?: T) => boolean,
) {
  const [value, setValue] = useState(atom.get());

  useEffect(() => {
    const listener = (newValue: T, prevValue?: T) => {
      if (predicate(newValue, prevValue)) {
        setValue(newValue);
      }
    };
    atom.subscribe(listener);
    return () => {
      atom.unsubscribe(listener);
    };
  }, [atom, predicate]);

  return value;
}
