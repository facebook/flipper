/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import config from '../fb-stubs/config';

const getPlatformSpecifier = (): string => {
  switch (os.platform()) {
    case 'win32':
      return 'windows';
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'mac';
    default:
      throw new Error('Unsupported platform.');
  }
};

/**
 * @param resp A parsed JSON object retrieved from the update server.
 */
const parseResponse = (resp: any): VersionCheckResult => {
  const version = resp.version;
  const platforms = resp.platforms;

  if (!version || !platforms) {
    return {kind: 'error', msg: 'Incomplete response.'};
  }

  const platformSpecifier = getPlatformSpecifier();
  const platform = platforms[platformSpecifier];
  if (!platform) {
    return {kind: 'error', msg: `Unsupported platform: ${platformSpecifier}.`};
  }

  return {
    kind: 'update-available',
    url: platform,
    version,
  };
};

export type VersionCheckResult =
  | {
      kind: 'update-available';
      url: string;
      version: string;
    }
  | {
      kind: 'up-to-date';
    }
  | {
      kind: 'error';
      msg: string;
    };

export async function checkForUpdate(
  currentVersion: string,
): Promise<VersionCheckResult> {
  return fetch(`${config.updateServer}?version=${currentVersion}`).then(
    (res: Response) => {
      switch (res.status) {
        case 204:
          return {kind: 'up-to-date'};
        case 200:
          return res.json().then(parseResponse);
        default:
          return {
            kind: 'error',
            msg: `Server responded with ${res.statusText}.`,
          };
      }
    },
  );
}
