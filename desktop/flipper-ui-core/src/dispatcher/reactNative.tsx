/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers';
import {registerShortcut} from '../utils/registerShortcut';

type ShortcutEventCommand =
  | {
      shortcut: string;
      command: string;
    }
  | '';

export default (store: Store) => {
  const settings = store.getState().settingsState.reactNative;

  if (!settings?.shortcuts.enabled) {
    return;
  }

  const shortcuts: ShortcutEventCommand[] = [
    settings.shortcuts.reload && {
      shortcut: settings.shortcuts.reload,
      command: 'reload',
    },
    settings.shortcuts.openDevMenu && {
      shortcut: settings.shortcuts.openDevMenu,
      command: 'devMenu',
    },
  ];

  shortcuts.forEach(
    (shortcut: ShortcutEventCommand) =>
      shortcut &&
      shortcut.shortcut &&
      registerShortcut(shortcut.shortcut, () => {
        const devices = store
          .getState()
          .connections.devices.filter(
            (device) => device.os === 'Metro' && !device.isArchived,
          );

        devices.forEach((device) =>
          device.flipperServer.exec(
            'metro-command',
            device.serial,
            shortcut.command,
          ),
        );
      }),
  );
};
