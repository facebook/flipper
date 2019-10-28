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
    // Relaunching the process doesn't work in dev mode
    // because it just launches an empty electron shell.
    // Instead, approximate it by doing a refresh.
    // Should be roughly equivalent but there may be some differences.
    remote.getCurrentWindow().reload();
  }
}
