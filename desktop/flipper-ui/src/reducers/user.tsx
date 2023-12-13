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

export type Action = {
  type: 'SET_USER_PROFILE';
  payload?: User;
};

const INITIAL_STATE: State = {};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'SET_USER_PROFILE') {
    return action.payload ?? {};
  } else {
    return state;
  }
}

export const setUserProfile = (payload: User | undefined): Action => ({
  type: 'SET_USER_PROFILE',
  payload,
});
