/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './';
export type State = {
  webState: NTUsersFormData | null;
};
export type Action = {
  type: 'SET_SUPPORT_FORM_STATE';
  payload: NTUsersFormData | null;
};

export type NTUsersFormData = {
  flipper_trace: string | null;
};

export const initialState: () => State = () => ({
  webState: null,
});
export default function reducer(
  state: State | undefined,
  action: Actions,
): State {
  state = state || initialState();
  if (action.type === 'SET_SUPPORT_FORM_STATE') {
    return {
      ...state,
      webState: action.payload,
    };
  } else {
    return state;
  }
}

export const setSupportFormState = (
  payload: NTUsersFormData | null,
): Action => ({
  type: 'SET_SUPPORT_FORM_STATE',
  payload,
});
