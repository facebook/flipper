/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {_setFlipperLibImplementation} from 'flipper-plugin';
import type {Logger} from 'flipper-common';
import type {Store} from '../reducers';
import createPaste from '../fb-stubs/createPaste';
import GK from '../fb-stubs/GK';
import type BaseDevice from '../devices/BaseDevice';
import {clipboard, shell} from 'electron';
import constants from '../fb-stubs/constants';
import {addNotification} from '../reducers/notifications';
import {deconstructPluginKey} from 'flipper-common';
import {DetailSidebarImpl} from '../sandy-chrome/DetailSidebarImpl';
import {RenderHost} from '../RenderHost';

export function initializeFlipperLibImplementation(
  renderHost: RenderHost,
  store: Store,
  logger: Logger,
) {
  // late require to avoid cyclic dependency
  const {addSandyPluginEntries} = require('../MenuBar');
  _setFlipperLibImplementation({
    isFB: !constants.IS_PUBLIC_BUILD,
    logger,
    enableMenuEntries(entries) {
      addSandyPluginEntries(entries);
    },
    createPaste,
    GK(gatekeeper: string) {
      return GK.get(gatekeeper);
    },
    selectPlugin(device, client, pluginId, deeplink) {
      store.dispatch({
        type: 'SELECT_PLUGIN',
        payload: {
          selectedPlugin: pluginId,
          selectedDevice: device as BaseDevice,
          selectedAppId: client ? client.id : null,
          deepLinkPayload: deeplink,
          time: Date.now(),
        },
      });
    },
    writeTextToClipboard(text: string) {
      clipboard.writeText(text);
    },
    openLink(url: string) {
      shell.openExternal(url);
    },
    showNotification(pluginId, notification) {
      const parts = deconstructPluginKey(pluginId);
      store.dispatch(
        addNotification({
          pluginId: parts.pluginName,
          client: parts.client,
          notification,
        }),
      );
    },
    DetailsSidebarImplementation: DetailSidebarImpl,
    showSaveDialog: renderHost.showSaveDialog,
    showOpenDialog: renderHost.showOpenDialog,
    showSelectDirectoryDialog: renderHost.showSelectDirectoryDialog,
  });
}
