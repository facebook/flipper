/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Use of sync methods is cached.
/* eslint-disable node/no-sync */

import type {State, Store} from '../reducers/index';
import {sideEffect} from './sideEffect';
import {Logger, deconstructClientId} from 'flipper-common';
import {getFlipperServerConfig} from '../flipperServer';

type PlatformInfo = {
  arch: string;
  platform: string;
  unixname: string;
  versions: {
    [key: string]: string | undefined;
  };
};

export type SelectionInfo = {
  plugin: string | null;
  pluginName: string | null;
  pluginVersion: string | null;
  pluginEnabled: boolean | null;
  app: string | null;
  os: string | null;
  device: string | null;
  deviceName: string | null;
  deviceSerial: string | null;
  deviceType: string | null;
  archived: boolean | null;
};

export type Info = PlatformInfo & {
  selection: SelectionInfo;
};

let platformInfo: PlatformInfo | undefined;
let selection: SelectionInfo = {
  plugin: null,
  pluginName: null,
  pluginVersion: null,
  pluginEnabled: null,
  app: null,
  os: null,
  device: null,
  deviceName: null,
  deviceSerial: null,
  deviceType: null,
  archived: null,
};

export default (store: Store, _logger: Logger) => {
  return sideEffect(
    store,
    {
      name: 'recomputeSelectionInfo',
      throttleMs: 0,
      noTimeBudgetWarns: true,
      runSynchronously: true,
      fireImmediately: true,
    },
    getSelectionInfo,
    (newSelection, _store) => {
      selection = newSelection;
    },
  );
};

/**
 * This method builds up some metadata about the users environment that we send
 * on bug reports, analytic events, errors etc.
 */
export function getInfo(): Info {
  if (!platformInfo) {
    const envInfo = getFlipperServerConfig().environmentInfo;

    platformInfo = {
      arch: envInfo.os.arch,
      platform: envInfo.os.platform,
      unixname: envInfo.os.unixname,
      versions: envInfo.versions,
    };
  }
  return {
    ...platformInfo,
    selection,
  };
}

export function getAppVersion(): string {
  return getFlipperServerConfig().environmentInfo.appVersion;
}

export function stringifyInfo(info: Info): string {
  const lines = [
    `Platform: ${info.platform} ${info.arch} (headless)`,
    `Unixname: ${info.unixname}`,
    `Versions:`,
  ];

  for (const key in info.versions) {
    lines.push(`  ${key}: ${String(info.versions[key])}`);
  }

  return lines.join('\n');
}

export function getSelectionInfo({
  plugins: {clientPlugins, devicePlugins, loadedPlugins},
  connections: {
    selectedAppId,
    selectedPlugin,
    enabledDevicePlugins,
    enabledPlugins,
    selectedDevice,
  },
}: State): SelectionInfo {
  const clientIdParts = selectedAppId
    ? deconstructClientId(selectedAppId)
    : null;
  const loadedPlugin = selectedPlugin
    ? loadedPlugins.get(selectedPlugin)
    : null;
  const pluginEnabled =
    !!selectedPlugin &&
    ((enabledDevicePlugins.has(selectedPlugin) &&
      devicePlugins.has(selectedPlugin)) ||
      (clientIdParts &&
        enabledPlugins[clientIdParts.app]?.includes(selectedPlugin) &&
        clientPlugins.has(selectedPlugin)));
  return {
    plugin: selectedPlugin || null,
    pluginName: loadedPlugin?.name || null,
    pluginVersion: loadedPlugin?.version || null,
    pluginEnabled,
    app: clientIdParts?.app || null,
    device: selectedDevice?.title || null,
    deviceName: clientIdParts?.device || null,
    deviceSerial: selectedDevice?.serial || null,
    deviceType: selectedDevice?.deviceType || null,
    os: selectedDevice?.os || null,
    archived: selectedDevice?.isArchived || false,
  };
}
