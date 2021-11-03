/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import path from 'path';
import {AppMatchPattern} from '../types';
import {Device, getFlipperLib} from 'flipper-plugin';

let patternsPath: string | undefined;

function getPatternsBasePath() {
  return (patternsPath =
    patternsPath ?? path.join(getFlipperLib().paths.appPath, 'facebook'));
}

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
  return new Promise<Array<AppMatchPattern>>((resolve, reject) => {
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
      const patternsFilePath = path.join(getPatternsBasePath(), filename);
      fs.readFile(patternsFilePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data.toString()));
        }
      });
    } else if (appName != null) {
      console.log('No rule for app ' + appName);
      resolve([]);
    } else {
      reject(new Error('selectedApp was null'));
    }
  });
};
