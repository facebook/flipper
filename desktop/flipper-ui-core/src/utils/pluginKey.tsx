/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function getPluginKey(
  selectedAppId: string | null | undefined,
  baseDevice: {serial: string} | null | undefined,
  pluginID: string,
): string {
  if (selectedAppId) {
    return `${selectedAppId}#${pluginID}`;
  }
  if (baseDevice) {
    // If selected App is not defined, then the plugin is a device plugin
    return `${baseDevice.serial}#${pluginID}`;
  }
  return `unknown#${pluginID}`;
}

export const pluginKey = (serial: string, pluginName: string): string => {
  return `${serial}#${pluginName}`;
};
