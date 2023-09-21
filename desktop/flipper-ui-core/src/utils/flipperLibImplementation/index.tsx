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
import {
  currentUser,
  internGraphGETAPIRequest,
  internGraphPOSTAPIRequest,
  isConnected,
} from '../../fb-stubs/user';

export function initializeFlipperLibImplementation(
  renderHost: RenderHost,
  store: Store,
  logger: Logger,
) {
  const base = baseFlipperLibImplementation(renderHost, logger);
  _setFlipperLibImplementation({
    ...base,
    intern: {
      ...base.intern,
      graphGet: internGraphGETAPIRequest,
      graphPost: internGraphPOSTAPIRequest,
      currentUser,
      isConnected,
    },
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
    settings() {
      const darkModeState = store.getState().settingsState.darkMode;
      let isDarkMode = darkModeState === 'dark';
      if (
        darkModeState === 'system' &&
        window.matchMedia('(prefers-color-scheme:dark)').matches
      ) {
        isDarkMode = true;
      }
      return {isDarkMode};
    },
  });
}
