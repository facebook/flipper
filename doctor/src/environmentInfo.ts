/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {run} from 'envinfo';

export type EnvironmentInfo = {
  SDKs: {
    'iOS SDK': {
      Platforms: string[];
    };
    'Android SDK':
      | {
          'API Levels': string[] | 'Not Found';
          'Build Tools': string[] | 'Not Found';
          'System Images': string[] | 'Not Found';
          'Android NDK': string | 'Not Found';
        }
      | 'Not Found';
  };
  IDEs: {
    Xcode: {
      version: string;
      path: string;
    };
  };
};

export async function getEnvInfo(): Promise<EnvironmentInfo> {
  // Temporary fix for https://github.com/facebook/flipper/issues/667 until it properly fixed in 'envinfo'.
  process.env.JAVA_OPTS =
    '-XX:+IgnoreUnrecognizedVMOptions --add-modules java.se.ee';
  return JSON.parse(
    await run(
      {
        SDKs: ['iOS SDK', 'Android SDK'],
        IDEs: ['Xcode'],
      },
      {json: true, showNotFound: true},
    ),
  );
}
