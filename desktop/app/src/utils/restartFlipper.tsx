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

export default function restart() {
  if (isProduction()) {
    remote.app.relaunch();
    remote.app.exit();
  } else {
    // Relaunching the process with the standard way doesn't work in dev mode.
    // So instead we're sending a signal to dev server to kill the current instance of electron and launch new.
    fetch(`${remote.process.env.DEV_SERVER_URL}/_restartElectron`, {
      method: 'POST',
    });
  }
}
