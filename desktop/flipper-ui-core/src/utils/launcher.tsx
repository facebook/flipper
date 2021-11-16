/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import os from 'os';
import xdg from 'xdg-basedir';
import {ProcessConfig} from './processConfig';
import {Store} from '../reducers/index';

// There is some disagreement among the XDG Base Directory implementations
// whether to use ~/Library/Preferences or ~/.config on MacOS. The Launcher
// expects the former, whereas `xdg-basedir` implements the latter.
const xdgConfigDir = () =>
  os.platform() === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Preferences')
    : xdg.config || path.join(os.homedir(), '.config');

export const launcherConfigDir = () =>
  path.join(
    xdgConfigDir(),
    os.platform() == 'darwin' ? 'rs.flipper-launcher' : 'flipper-launcher',
  );

export function initLauncherHooks(config: ProcessConfig, store: Store) {
  if (config.launcherMsg) {
    store.dispatch({
      type: 'LAUNCHER_MSG',
      payload: {
        severity: 'warning',
        message: config.launcherMsg,
      },
    });
  }
}
