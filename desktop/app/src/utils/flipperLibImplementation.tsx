/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {FlipperLib} from 'flipper-plugin';
import type {Logger} from '../fb-interfaces/Logger';
import type {Store} from '../reducers';
import createPaste from '../fb-stubs/createPaste';
import GK from '../fb-stubs/GK';
import type BaseDevice from '../devices/BaseDevice';

let flipperLibInstance: FlipperLib | undefined;

export function initializeFlipperLibImplementation(
  store: Store,
  logger: Logger,
) {
  // late require to avoid cyclic dependency
  const {addSandyPluginEntries} = require('../MenuBar');
  flipperLibInstance = {
    logger,
    enableMenuEntries(entries) {
      addSandyPluginEntries(entries);
    },
    createPaste,
    GK(gatekeeper: string) {
      return GK.get(gatekeeper);
    },
    isPluginAvailable(device, client, pluginId) {
      // supported device pluin
      if (device.devicePlugins.includes(pluginId)) {
        return true;
      }
      if (client) {
        // plugin supported?
        if (client.plugins.includes(pluginId)) {
          // part of an archived device?
          if (device.isArchived) {
            return true;
          }
          // plugin enabled?
          if (
            store
              .getState()
              .connections.enabledPlugins[client.query.app]?.includes(pluginId)
          ) {
            return true;
          }
        }
      }
      return false;
    },
    selectPlugin(device, client, pluginId, deeplink) {
      store.dispatch({
        type: 'SELECT_PLUGIN',
        payload: {
          selectedPlugin: pluginId,
          selectedDevice: device as BaseDevice,
          selectedApp: client ? client.id : null,
          deepLinkPayload: deeplink,
          time: Date.now(),
        },
      });
    },
  };
}

export function getFlipperLibImplementation(): FlipperLib {
  if (!flipperLibInstance) {
    throw new Error('Flipper lib not instantiated');
  }
  return flipperLibInstance;
}

export function setFlipperLibImplementation(impl: FlipperLib) {
  flipperLibInstance = impl;
}
