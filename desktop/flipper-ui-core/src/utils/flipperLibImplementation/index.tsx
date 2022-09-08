/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {_setFlipperLibImplementation} from 'flipper-plugin';
import {Logger} from 'flipper-common';
import type {Store} from '../../reducers';
import createPaste from '../../fb-stubs/createPaste';
import {BaseDevice, baseFlipperLibImplementation} from 'flipper-frontend-core';
import {DetailSidebarImpl} from '../../sandy-chrome/DetailSidebarImpl';
import {addNotification} from '../../reducers/notifications';
import {deconstructPluginKey} from 'flipper-common';
import {RenderHost} from 'flipper-frontend-core';
import {setMenuEntries} from '../../reducers/connections';

export function initializeFlipperLibImplementation(
  renderHost: RenderHost,
  store: Store,
  logger: Logger,
) {
  _setFlipperLibImplementation({
    ...baseFlipperLibImplementation(renderHost, logger),
    enableMenuEntries(entries) {
      store.dispatch(setMenuEntries(entries));
    },
    createPaste,
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
  });
}
