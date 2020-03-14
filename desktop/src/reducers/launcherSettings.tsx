/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './index';

export type LauncherSettings = {
  ignoreLocalPin: boolean;
};

export type Action = {
  type: 'UPDATE_LAUNCHER_SETTINGS';
  payload: LauncherSettings;
};

export const defaultLauncherSettings: LauncherSettings = {
  ignoreLocalPin: false,
};

export default function reducer(
  state: LauncherSettings = defaultLauncherSettings,
  action: Actions,
): LauncherSettings {
  if (action.type === 'UPDATE_LAUNCHER_SETTINGS') {
    return action.payload;
  }
  return state;
}

export function updateLauncherSettings(settings: LauncherSettings): Action {
  return {
    type: 'UPDATE_LAUNCHER_SETTINGS',
    payload: settings,
  };
}
