/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {produce, Draft} from 'immer';
import {useState, useEffect} from 'react';
import {getCurrentPluginInstance} from '../plugin/PluginBase';

export type Atom<T> = {
  get(): T;
  set(newValue: T): void;
  update(recipe: (draft: Draft<T>) => void): void;
};

class AtomValue<T> implements Atom<T> {
  value: T;
  listeners: ((value: T) => void)[] = [];

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get() {
    return this.value;
  }

  set(nextValue: T) {
    if (nextValue !== this.value) {
      this.value = nextValue;
      this.notifyChanged();
    }
  }

  update(recipe: (draft: Draft<T>) => void) {
    this.set(produce(this.value, recipe));
  }

  notifyChanged() {
    // TODO: add scheduling
    this.listeners.slice().forEach((l) => l(this.value));
  }

  subscribe(listener: (value: T) => void) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: (value: T) => void) {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) {
      this.listeners.splice(idx, 1);
    }
  }
}

type StateOptions = {
  /**
   * Should this state persist when exporting a plugin?
   * If set, the atom will be saved / loaded under the key provided
   */
  persist?: string;
};

export function createState<T>(
  initialValue: T,
  options: StateOptions = {},
): Atom<T> {
  const atom = new AtomValue<T>(initialValue);
  if (getCurrentPluginInstance() && options.persist) {
    const {initialStates, rootStates} = getCurrentPluginInstance()!;
    if (initialStates) {
      if (options.persist in initialStates) {
        atom.set(initialStates[options.persist]);
      } else {
        console.warn(
          `Tried to initialize plugin with existing data, however data for "${options.persist}" is missing. Was the export created with a different Flipper version?`,
        );
      }
    }
    if (rootStates[options.persist]) {
      throw new Error(
        `Some other state is already persisting with key "${options.persist}"`,
      );
    }
    rootStates[options.persist] = atom;
  }
  return atom;
}

export function useValue<T>(atom: Atom<T>): T {
  const [localValue, setLocalValue] = useState<T>(atom.get());
  useEffect(() => {
    // atom might have changed between mounting and effect setup
    // in that case, this will cause a re-render, otherwise not
    setLocalValue(atom.get());
    (atom as AtomValue<T>).subscribe(setLocalValue);
    return () => {
      (atom as AtomValue<T>).unsubscribe(setLocalValue);
    };
  }, [atom]);
  return localValue;
}

export function isAtom(value: any): value is Atom<any> {
  return value instanceof AtomValue;
}
