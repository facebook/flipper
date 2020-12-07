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
import {BaseDevice, AndroidDevice, IOSDevice} from 'flipper';
import {AppMatchPattern} from '../types';

const extractAppNameFromSelectedApp = (selectedApp: string | null) => {
  if (selectedApp == null) {
    return null;
  } else {
    return selectedApp.split('#')[0];
  }
};

export const getAppMatchPatterns = (
  selectedApp: string | null,
  device: BaseDevice,
) => {
  return new Promise<Array<AppMatchPattern>>((resolve, reject) => {
    const appName = extractAppNameFromSelectedApp(selectedApp);
    if (appName === 'Facebook') {
      let filename: string;
      if (device instanceof AndroidDevice) {
        filename = 'facebook-match-patterns-android.json';
      } else if (device instanceof IOSDevice) {
        filename = 'facebook-match-patterns-ios.json';
      } else {
        return;
      }
      const patternsPath = path.join('facebook', filename);
      fs.readFile(patternsPath, (err, data) => {
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
