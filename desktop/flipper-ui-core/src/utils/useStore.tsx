/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  useStore as useReduxStore,
  useSelector,
  shallowEqual,
  useDispatch as useDispatchBase,
} from 'react-redux';
import {Dispatch as ReduxDispatch} from 'redux';
import {State, Actions, Store} from '../reducers/index';

/**
 * Strongly typed wrapper or Redux's useSelector.
 *
 * Equality defaults to shallowEquality
 */
export function useStore<Selected>(
  selector: (state: State) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
): Selected;
export function useStore(): Store;
export function useStore(selector?: any, equalityFn?: any) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (arguments.length === 0) return useReduxStore();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSelector(selector, equalityFn ?? shallowEqual);
}

export type Dispatch = ReduxDispatch<Actions>;

/**
 * Strongly typed useDispatch wrapper for the Flipper redux store.
 */
export function useDispatch(): Dispatch {
  return useDispatchBase() as any;
}
