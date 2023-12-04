/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {LauncherSettings} from 'flipper-common';
import {getRenderHostInstance} from 'flipper-frontend-core';
import {Actions} from './index';

export type Action = {
  type: 'UPDATE_LAUNCHER_SETTINGS';
  payload: LauncherSettings;
};

export default function reducer(
  state: LauncherSettings = getRenderHostInstance().serverConfig
    .launcherSettings,
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
