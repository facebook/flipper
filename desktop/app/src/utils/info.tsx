/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import isProduction, {isTest} from './isProduction';
import fs from 'fs-extra';
import {getStaticPath} from './pathUtils';
import type {State, Store} from '../reducers/index';
import {deconstructClientId} from './clientUtils';
import {sideEffect} from './sideEffect';
import {Logger} from '../fb-interfaces/Logger';

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
    platformInfo = {
      arch: process.arch,
      platform: process.platform,
      unixname: os.userInfo().username,
      versions: {
        electron: process.versions.electron,
        node: process.versions.node,
        platform: os.release(),
      },
    };
  }
  return {
    ...platformInfo,
    selection,
  };
}

let APP_VERSION: string | undefined;
export function getAppVersion(): string {
  return (APP_VERSION =
    APP_VERSION ??
    process.env.FLIPPER_FORCE_VERSION ??
    (isTest()
      ? '0.0.0'
      : (isProduction()
          ? fs.readJsonSync(getStaticPath('package.json'), {
              throws: false,
            })?.version
          : require('../../package.json').version) ?? '0.0.0'));
}

export function stringifyInfo(info: Info): string {
  const lines = [
    `Platform: ${info.platform} ${info.arch}`,
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
    selectedApp,
    selectedPlugin,
    enabledDevicePlugins,
    enabledPlugins,
    selectedDevice,
  },
}: State): SelectionInfo {
  const clientIdParts = selectedApp ? deconstructClientId(selectedApp) : null;
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
