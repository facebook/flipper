/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {path} from 'flipper-plugin';
import {AppMatchPattern} from '../types';
import {Device, getFlipperLib} from 'flipper-plugin';

const extractAppNameFromSelectedApp = (selectedApp: string | null) => {
  if (selectedApp == null) {
    return null;
  } else {
    return selectedApp.split('#')[0];
  }
};

export const getAppMatchPatterns = (
  selectedApp: string | null,
  device: Device,
) => {
  return new Promise<Array<AppMatchPattern>>(async (resolve, reject) => {
    const appName = extractAppNameFromSelectedApp(selectedApp);
    if (appName === 'Facebook') {
      let filename: string;
      if (device.os === 'Android') {
        filename = 'facebook-match-patterns-android.json';
      } else if (device.os === 'iOS') {
        filename = 'facebook-match-patterns-ios.json';
      } else {
        return;
      }
      const patternsFilePath = path.join(
        getFlipperLib().paths.staticPath,
        'facebook',
        filename,
      );
      const patternsFileContentString =
        await getFlipperLib().remoteServerContext.fs.readFile(patternsFilePath);
      return JSON.parse(patternsFileContentString);
    } else if (appName != null) {
      console.log('No rule for app ' + appName);
      resolve([]);
    } else {
      reject(new Error('selectedApp was null'));
    }
  });
};
