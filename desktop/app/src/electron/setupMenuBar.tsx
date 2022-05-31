/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger} from 'flipper-common';
import {_buildInMenuEntries, _wrapInteractionHandler} from 'flipper-plugin';
import {ElectronIpcClientRenderer} from '../electronIpc';

export function setupMenuBarTracking(
  electronIpcClient: ElectronIpcClientRenderer,
) {
  electronIpcClient.on('menuItemAction', ({action, menu, label}) => {
    if (action === 'click') {
      getLogger().track('usage', 'menuItemClick', {menu, label});
    }
  });
}
