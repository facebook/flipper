/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {remote} from 'electron';
import isProduction from './isProduction';

export default function restart(update: boolean = false) {
  if (isProduction()) {
    if (update) {
      const options = {
        args: process.argv
          .splice(0, 1)
          .filter((arg) => arg !== '--no-launcher' && arg !== '--no-updater'),
      };
      remote.app.relaunch(options);
    } else {
      remote.app.relaunch();
    }
    remote.app.exit();
  } else {
    // Relaunching the process with the standard way doesn't work in dev mode.
    // So instead we're sending a signal to dev server to kill the current instance of electron and launch new.
    fetch(`${remote.process.env.DEV_SERVER_URL}/_restartElectron`, {
      method: 'POST',
    });
  }
}
