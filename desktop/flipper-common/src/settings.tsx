/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export enum Tristate {
  True,
  False,
  Unset,
}

/** Settings used by both Server and UI.
 * TODO: some settings might be flipper environment specific,
 * and should ideally bemoved to local storage, like 'darkMode'
 */
export type Settings = {
  androidHome: string;
  enableAndroid: boolean;
  enableIOS: boolean;
  enablePhysicalIOS: boolean;
  /**
   * If unset, this will assume the value of the GK setting.
   * Note that this setting has no effect in the open source version
   * of Flipper.
   */
  enablePrefetching: Tristate;
  idbPath: string;
  reactNative: {
    shortcuts: {
      enabled: boolean;
      reload: string;
      openDevMenu: string;
    };
  };
  darkMode: 'dark' | 'light' | 'system';
  showWelcomeAtStartup: boolean;
  suppressPluginErrors: boolean;
  persistDeviceData: boolean;
  /**
   * Plugin marketplace - allow internal plugin distribution
   */
  enablePluginMarketplace: boolean;
  marketplaceURL: string;
  enablePluginMarketplaceAutoUpdate: boolean;
  /**
   * Adbkit settings are needed because localhost can resolve to
   * 127.0.0.1 or [::1] depending on the machine (IPV4 or IPV6)
   * this unknown behaviour of which address will be used by the
   * adbkit may cause it not to connect to the correct address where the
   * adb server is running. Notice that using the env variable ADB_SERVER_SOCKET
   * set to tcp:127.0.0.1:5037 would make the adb start-server fail and so
   * cannot be used as a solution.
   */
  adbKitSettings?: {
    host?: string;
    port?: number;
  };
  server?: {
    enabled: boolean;
  };
};

export enum ReleaseChannel {
  DEFAULT = 'default',
  STABLE = 'stable',
  INSIDERS = 'insiders',
}

/** Launcher settings only apply to Electron, and aren't managed or relevant for flipper-server-core */
export type LauncherSettings = {
  releaseChannel: ReleaseChannel;
  ignoreLocalPin: boolean;
};

// Settings that primarily only apply to Electron atm
// TODO: further separate between flipper-ui config and Electron config
export type ProcessConfig = {
  disabledPlugins: string[];
  lastWindowPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  screenCapturePath: string | null;
  launcherMsg: string | null;
  // Controls whether to delegate to the launcher if present.
  launcherEnabled: boolean;
  updaterEnabled: boolean;
  // Control whether to suppress "update available" notifications
  suppressPluginUpdateNotifications?: boolean;
};

export type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd';

export type EnvironmentInfo = {
  processId: number;
  isProduction: boolean;
  isHeadlessBuild: boolean;
  releaseChannel: ReleaseChannel;
  flipperReleaseRevision?: string;
  appVersion: string;
  os: {
    arch: string;
    platform: Platform;
    unixname: string;
  };
  versions: {
    electron?: string;
    node: string;
    platform: string;
  };
};
