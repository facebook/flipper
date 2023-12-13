/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {VersionCheckResult} from '../chrome/UpdateIndicator';
import {getFlipperServerConfig} from '../flipperServer';
import config from './config';

const getPlatformSpecifier = (): string => {
  switch (getFlipperServerConfig().environmentInfo.os.platform) {
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

export async function checkForUpdate(
  currentVersion: string,
): Promise<VersionCheckResult> {
  return fetch(`${config.updateServer}?version=${currentVersion}`).then(
    (res: Response) => {
      switch (res.status) {
        case 204:
          return {kind: 'up-to-date'};
        case 200:
          if (res.url.startsWith('https://www.facebook.com/login/')) {
            // We're being redirected because we're not on an authenticated network.
            // Treat that as being up-to-date as there's special-casing the UI for
            // this is not worth it.
            console.log('Skipping version check on non-authenticated network.');
            return {kind: 'up-to-date'};
          }
          // Good use of nesting.
          // eslint-disable-next-line promise/no-nesting
          return res.json().then(parseResponse);
        default:
          const msg = `Server responded with ${res.statusText}.`;
          console.warn('Version check failure: ', msg);
          return {
            kind: 'error',
            msg,
          };
      }
    },
  );
}
