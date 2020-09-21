/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  useSelector,
  shallowEqual,
  useDispatch as useDispatchBase,
} from 'react-redux';
import {Dispatch} from 'redux';
import {State, Actions} from '../reducers/index';

/**
 * Strongly typed wrapper or Redux's useSelector.
 *
 * Equality defaults to shallowEquality
 */
export function useStore<Selected>(
  selector: (state: State) => Selected,
  equalityFn: (left: Selected, right: Selected) => boolean = shallowEqual,
): Selected {
  return useSelector(selector, equalityFn);
}

/**
 * Strongly typed useDispatch wrapper for the Flipper redux store.
 */
export function useDispatch(): Dispatch<Actions> {
  return useDispatchBase();
}
