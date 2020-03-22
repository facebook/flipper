/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';

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
    },
  };
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
