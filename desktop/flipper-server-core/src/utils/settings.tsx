/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import {resolve} from 'path';
import {Settings, Tristate} from 'flipper-common';
import {readFile, writeFile, pathExists, mkdirp} from 'fs-extra';
import {flipperSettingsFolder} from './paths';

export async function loadSettings(
  settingsString: string = '',
): Promise<Settings> {
  if (settingsString !== '') {
    try {
      return replaceDefaultSettings(JSON.parse(settingsString));
    } catch (e) {
      throw new Error("couldn't read the user settingsString");
    }
  }
  if (!pathExists(getSettingsFile())) {
    return getDefaultSettings();
  }
  try {
    const json = await readFile(getSettingsFile(), {encoding: 'utf8'});
    return JSON.parse(json);
  } catch (e) {
    console.warn('Failed to load settings file', e);
    return getDefaultSettings();
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await mkdirp(flipperSettingsFolder);
  await writeFile(getSettingsFile(), JSON.stringify(settings, null, 2), {
    encoding: 'utf8',
  });
}

function getSettingsFile() {
  return resolve(flipperSettingsFolder, 'settings.json');
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
    darkMode: 'light',
    showWelcomeAtStartup: true,
    suppressPluginErrors: false,
    persistDeviceData: false,
    enablePluginMarketplace: false,
    marketplaceURL: '',
    enablePluginMarketplaceAutoUpdate: true,
    server: {
      enabled: false,
    },
  };
}

function getDefaultAndroidSdkPath() {
  return os.platform() === 'win32' ? getWindowsSdkPath() : '/opt/android_sdk';
}

function getWindowsSdkPath() {
  return `${os.homedir()}\\AppData\\Local\\android\\sdk`;
}

function replaceDefaultSettings(userSettings: Partial<Settings>): Settings {
  return {...getDefaultSettings(), ...userSettings};
}
