/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger} from 'flipper-common';

export type OpenPluginParams = {
  pluginId: string;
  client: string | undefined;
  devices: string[];
  payload: string | undefined;
};

export type DeeplinkInteractionState =
  | 'INIT' // Sent every time a user enters a deeplink flow
  | 'ERROR' // Something went wrong (parsing, etc.) comes with more metadata attached
  | 'PLUGIN_LIGHTHOUSE_BAIL' // User did not connect to VPN/Lighthouse when asked
  | 'PLUGIN_STATUS_BAIL' // User did not install the plugin (has `extra` attribute with more information)
  | 'PLUGIN_DEVICE_BAIL' // User did not launch a new device
  | 'PLUGIN_CLIENT_BAIL' // User did not launch a supported app
  | 'PLUGIN_DEVICE_SELECTION_BAIL' // User closed dialogue asking to select one of many devices
  | 'PLUGIN_CLIENT_SELECTION_BAIL' // User closed dialogue asking to select one of many apps
  | 'PLUGIN_DEVICE_UNSUPPORTED' // The device did not match the requirements specified in the deeplink URL
  | 'PLUGIN_CLIENT_UNSUPPORTED' // The already opened app did not match the requirements specified in the deeplink URL
  | 'PLUGIN_OPEN_SUCCESS'; // Everything is awesome

export type DeeplinkInteraction = {
  state: DeeplinkInteractionState;
  errorMessage?: string;
  plugin?: OpenPluginParams;
  extra?: object;
};

export function track(
  logger: Logger,
  query: string,
  interaction: DeeplinkInteraction,
) {
  logger.track(
    'usage',
    'deeplink',
    {
      ...interaction,
      query,
    },
    interaction.plugin?.pluginId,
  );
}
