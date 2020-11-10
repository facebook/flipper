/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {remote} from 'electron';
import MetroDevice from '../devices/MetroDevice';
import {Store} from '../reducers';

type ShortcutEventCommand =
  | {
      shortcut: string;
      command: string;
    }
  | '';

export default (store: Store) => {
  const settings = store.getState().settingsState.reactNative;

  if (!settings.shortcuts.enabled) {
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
      remote.globalShortcut.register(shortcut.shortcut, () => {
        const devices = store
          .getState()
          .connections.devices.filter(
            (device) => device.os === 'Metro' && !device.isArchived,
          ) as MetroDevice[];

        devices.forEach((device) => device.sendCommand(shortcut.command));
      }),
  );
};
