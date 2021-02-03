/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import {remote} from 'electron';

export type Info = {
  arch: string;
  platform: string;
  unixname: string;
  versions: {
    [key: string]: string | undefined;
  };
};

/**
 * This method builds up some metadata about the users environment that we send
 * on bug reports, analytic events, errors etc.
 */
export function getInfo(): Info {
  return {
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

let APP_VERSION: string | undefined = undefined;
// Prefer using this function over manually calling `remote.app.getVersion()`
// as calls to the remote object go over IPC and can be slow.
export function getAppVersion(): string | undefined {
  if (APP_VERSION === undefined && remote) {
    APP_VERSION = remote.app.getVersion();
  }

  return APP_VERSION;
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
