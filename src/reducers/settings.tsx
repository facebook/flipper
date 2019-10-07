/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Actions} from './index';

export type Settings = {
  androidHome: string;
};

export type State = {
  settings: Settings;
};

export type Action =
  | {type: 'INIT'}
  | {
      type: 'UPDATE_SETTINGS';
      payload: Settings;
    };

const initialState: State = {
  settings: {
    androidHome: '/opt/android_sdk',
  },
};

export default function reducer(
  state: State = initialState,
  action: Actions,
): State {
  if (action.type === 'UPDATE_SETTINGS') {
    return {
      ...state,
      settings: action.payload,
    };
  }
  return state;
}

export function updateSettings(settings: Settings): Action {
  return {
    type: 'UPDATE_SETTINGS',
    payload: settings,
  };
}
