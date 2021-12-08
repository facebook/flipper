/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import {resolve} from 'path';
import xdg from 'xdg-basedir';
import {Settings, Tristate} from 'flipper-common';
import {readFile, writeFile, access} from 'fs-extra';

export async function loadSettings(): Promise<Settings> {
  if (!access(getSettingsFile())) {
    return getDefaultSettings();
  }
  const json = await readFile(getSettingsFile(), {encoding: 'utf8'});
  return JSON.parse(json);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeFile(getSettingsFile(), JSON.stringify(settings, null, 2), {
    encoding: 'utf8',
  });
}

function getSettingsFile() {
  return resolve(
    ...(xdg.config ? [xdg.config] : [os.homedir(), '.config']),
    'flipper',
    'settings.json',
  );
}

export const DEFAULT_ANDROID_SDK_PATH = getDefaultAndroidSdkPath();

function getDefaultSettings(): Settings {
  return {
    androidHome: getDefaultAndroidSdkPath(),
    enableAndroid: true,
    enableIOS: os.platform() === 'darwin',
    enablePhysicalIOS: os.platform() === 'darwin',
    enablePrefetching: Tristate.Unset,
    idbPath: '/usr/local/bin/idb',
    reactNative: {
      shortcuts: {
        enabled: false,
        reload: 'Alt+Shift+R',
        openDevMenu: 'Alt+Shift+D',
      },
    },
    darkMode: 'light',
    showWelcomeAtStartup: true,
    suppressPluginErrors: false,
  };
}

function getDefaultAndroidSdkPath() {
  return os.platform() === 'win32' ? getWindowsSdkPath() : '/opt/android_sdk';
}

function getWindowsSdkPath() {
  return `${os.homedir()}\\AppData\\Local\\android\\sdk`;
}
