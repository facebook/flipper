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

async function retrieveAndParseEnvInfo(): Promise<any> {
  return JSON.parse(
    await run(
      {
        SDKs: ['iOS SDK', 'Android SDK'],
        IDEs: ['Xcode'],
        Languages: ['Java'],
      },
      {json: true, showNotFound: true},
    ),
  );
}

// Temporary workaround for https://github.com/facebook/flipper/issues/667 until it properly fixed in 'envinfo'.
async function workaroundForNewerJavaVersions(envInfo: any) {
  try {
    if (envInfo.Languages.Java && envInfo.Languages.Java.version) {
      const [majorVersion] = envInfo.Languages.Java.version
        .split('.')
        .slice(0, 1)
        .map((x: string) => parseInt(x, 10));
      if (8 < majorVersion && majorVersion < 11) {
        process.env.JAVA_OPTS =
          '-XX:+IgnoreUnrecognizedVMOptions --add-modules java.se.ee';
        return await retrieveAndParseEnvInfo();
      }
    }
  } catch (e) {
    console.error(e);
  }
  return envInfo;
}

export async function getEnvInfo(): Promise<EnvironmentInfo> {
  return workaroundForNewerJavaVersions(await retrieveAndParseEnvInfo());
}
