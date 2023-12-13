/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Actions} from './index';
import {Settings} from 'flipper-common';
import {getFlipperServerConfig} from '../flipperServer';

export type Action =
  | {type: 'INIT'}
  | {
      type: 'UPDATE_SETTINGS';
      payload: Settings;
    };

export default function reducer(
  state: Settings = getFlipperServerConfig().settings,
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
