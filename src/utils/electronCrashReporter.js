/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {exists, mkdir} from 'fs';
import {promisify} from 'util';
import {crashReporter, remote} from 'electron';
import isProduction from '../utils/isProduction.js';
import constants from '../fb-stubs/constants.tsx';
import {tmpName} from 'tmp';
import {resolve} from 'path';

// Cross platform way to find the /tmp directory or equivalent.
// The tempPath set should be persistent across app restarts.
const tempPathPromise: Promise<string> = promisify(tmpName)({
  template: '/tmp/tmp-XXXXXX',
}).then(name => resolve(name, '..', 'flipper'));

export default function initCrashReporter(sessionId: string): Promise<void> {
  const flipperVersion = remote.app.getVersion();
  return tempPathPromise.then(tempPath => {
    return promisify(exists)(tempPath)
      .then(pathExists => {
        if (!pathExists) {
          return promisify(mkdir)(tempPath);
        }
        return Promise.resolve();
      })
      .then(() => {
        remote.app.setPath('temp', tempPath);
        const electronCrashReporterArgs = {
          productName: 'Flipper',
          companyName: 'Facebook',
          submitURL: 'https://www.facebook.com/intern/flipper/crash_upload',
          uploadToServer: isProduction() && !constants.IS_PUBLIC_BUILD,
          ignoreSystemCrashHandler: true,
          extra: {
            flipper_version: flipperVersion,
            session_id: sessionId,
          },
        };
        remote.crashReporter.start(electronCrashReporterArgs);
        crashReporter.start(electronCrashReporterArgs);
      });
  });
}
