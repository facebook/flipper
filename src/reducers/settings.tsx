/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './index';

export enum Tristate {
  True,
  False,
  Unset,
}

export type Settings = {
  androidHome: string;
  enableAndroid: boolean;
  /**
   * If unset, this will assume the value of the GK setting.
   * Note that this setting has no effect in the open source version
   * of Flipper.
   */
  enablePrefetching: Tristate;
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
  enablePrefetching: Tristate.Unset,
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
