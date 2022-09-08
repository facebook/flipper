/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
import {User} from 'flipper-common';

export type State = User;

export type Action =
  | {
      type: 'LOGIN';
      payload: User;
    }
  | {
      type: 'LOGOUT';
    };

const INITIAL_STATE: State = {};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'LOGOUT') {
    return {};
  } else if (action.type === 'LOGIN') {
    return {
      ...state,
      ...action.payload,
    };
  } else {
    return state;
  }
}

export const login = (payload: User): Action => ({
  type: 'LOGIN',
  payload,
});

export const logout = (): Action => ({
  type: 'LOGOUT',
});
