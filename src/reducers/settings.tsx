/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Actions} from './index';

export type Settings = {
  androidHome: string;
  enableAndroid: boolean;
};

export type Action =
  | {type: 'INIT'}
  | {
      type: 'UPDATE_SETTINGS';
      payload: Settings;
    };

const initialState: Settings = {
  androidHome: '/opt/android_sdk',
  enableAndroid: true,
};

export default function reducer(
  state: Settings = initialState,
  action: Actions,
): Settings {
  if (action.type === 'UPDATE_SETTINGS') {
    return action.payload;
  }
  return state;
}

export function updateSettings(settings: Settings): Action {
  return {
    type: 'UPDATE_SETTINGS',
    payload: settings,
  };
}
