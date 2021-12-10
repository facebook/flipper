/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {_setFlipperLibImplementation, RemoteNodeAPI} from 'flipper-plugin';
import type {BufferEncoding, ExecOptions, Logger} from 'flipper-common';
import type {Store} from '../reducers';
import createPaste from '../fb-stubs/createPaste';
import type BaseDevice from '../devices/BaseDevice';
import constants from '../fb-stubs/constants';
import {addNotification} from '../reducers/notifications';
import {deconstructPluginKey} from 'flipper-common';
import {DetailSidebarImpl} from '../sandy-chrome/DetailSidebarImpl';
import {RenderHost} from '../RenderHost';
import {setMenuEntries} from '../reducers/connections';

export function initializeFlipperLibImplementation(
  renderHost: RenderHost,
  store: Store,
  logger: Logger,
) {
  _setFlipperLibImplementation({
    isFB: !constants.IS_PUBLIC_BUILD,
    logger,
    enableMenuEntries(entries) {
      store.dispatch(setMenuEntries(entries));
    },
    createPaste,
    GK: renderHost.GK,
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
    writeTextToClipboard: renderHost.writeTextToClipboard,
    openLink: renderHost.openLink,
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
    importFile: renderHost.importFile,
    exportFile: renderHost.exportFile,
    paths: {
      appPath: renderHost.serverConfig.paths.appPath,
      homePath: renderHost.serverConfig.paths.homePath,
    },
    removeNodeAPI: {
      childProcess: {
        exec: (async (
          command: string,
          options?: ExecOptions & {encoding?: BufferEncoding},
        ) =>
          renderHost.flipperServer.exec(
            'node-api-exec',
            command,
            options,
          )) as RemoteNodeAPI['childProcess']['exec'],
      },
      fs: {},
    },
  });
}
