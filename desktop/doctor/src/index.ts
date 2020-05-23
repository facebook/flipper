/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import {EnvironmentInfo, getEnvInfo} from './environmentInfo';
export {EnvironmentInfo, getEnvInfo} from './environmentInfo';
import * as watchman from 'fb-watchman';
import * as fs from 'fs';
import * as path from 'path';

export type HealthcheckCategory = {
  label: string;
  isSkipped: false;
  isRequired: boolean;
  healthchecks: Healthcheck[];
};

export type SkippedHealthcheckCategory = {
  label: string;
  isSkipped: true;
  skipReason: string;
};

export type Healthchecks = {
  common: HealthcheckCategory | SkippedHealthcheckCategory;
  android: HealthcheckCategory | SkippedHealthcheckCategory;
  ios: HealthcheckCategory | SkippedHealthcheckCategory;
};

export type Healthcheck = {
  key: string;
  label: string;
  isRequired?: boolean;
  run: (env: EnvironmentInfo) => Promise<HealthCheckRunResult>;
};

export type HealthCheckRunResult = {
  hasProblem: boolean;
  message: string;
};

export type HealthCheckCategoryResult = {
  key: string;
  label: string;
  isRequired: boolean;
  result: {
    hasProblem: boolean;
  };
};

export type CategoryResult = [
  string,
  {
    label: string;
    results: HealthCheckCategoryResult[];
  },
];

export function getHealthchecks(): Healthchecks {
  return {
    common: {
      label: 'Common',
      isRequired: true,
      isSkipped: false,
      healthchecks: [
        {
          key: 'common.openssl',
          label: 'OpenSSL Installed',
          run: async () => {
            const result = await tryExecuteCommand('openssl version');
            const hasProblem = result.hasProblem;
            return {
              hasProblem,
              message: `OpenSSL (https://wiki.openssl.org/index.php/Binaries) is${
                hasProblem ? ' not' : ''
              } not installed or not added to PATH. ${result.message}.`,
            };
          },
        },
        {
          key: 'common.watchman',
          label: 'Watchman Installed',
          run: async () => {
            const isAvailable = await isWatchmanAvailable();
            return {
              hasProblem: !isAvailable,
              message: `Watchman file watching service (https://facebook.github.io/watchman/) is${
                isAvailable ? '' : ' not'
              } installed or not added to PATH. Live reloading after changes during Flipper plugin development is disabled.`,
            };
          },
        },
      ],
    },
    android: {
      label: 'Android',
      isRequired: false,
      isSkipped: false,
      healthchecks: [
        {
          key: 'android.sdk',
          label: 'SDK Installed',
          isRequired: true,
          run: async () => {
            if (process.env.ANDROID_HOME) {
              const androidHome = process.env.ANDROID_HOME;
              if (!fs.existsSync(androidHome)) {
                return {
                  hasProblem: true,
                  message: `ANDROID_HOME points to a folder which does not exist: ${androidHome}.`,
                };
              }
              const platformToolsDir = path.join(androidHome, 'platform-tools');
              if (!fs.existsSync(path.join(androidHome, 'platform-tools'))) {
                return {
                  hasProblem: true,
                  message: `Android SDK Platform Tools not found at the expected location "${platformToolsDir}". Probably they are not installed.`,
                };
              }
              return await tryExecuteCommand(
                `"${path.join(platformToolsDir, 'adb')}" version`,
              );
            }
            return await tryExecuteCommand('adb version');
          },
        },
      ],
    },
    ios: {
      label: 'iOS',
      ...(process.platform === 'darwin'
        ? {
            isRequired: false,
            isSkipped: false,
            healthchecks: [
              {
                key: 'ios.sdk',
                label: 'SDK Installed',
                isRequired: true,
                run: async (e: EnvironmentInfo) => {
                  const hasProblem =
                    !e.SDKs['iOS SDK'] ||
                    !e.SDKs['iOS SDK'].Platforms ||
                    !e.SDKs['iOS SDK'].Platforms.length;
                  const message = hasProblem
                    ? 'iOS SDK is not installed. You can install it using Xcode (https://developer.apple.com/xcode/).'
                    : `iOS SDK is installed for the following platforms: ${JSON.stringify(
                        e.SDKs['iOS SDK'].Platforms,
                      )}.`;
                  return {
                    hasProblem,
                    message,
                  };
                },
              },
              {
                key: 'ios.xcode',
                label: 'XCode Installed',
                isRequired: true,
                run: async (e: EnvironmentInfo) => {
                  const hasProblem = e.IDEs == null || e.IDEs.Xcode == null;
                  const message = hasProblem
                    ? 'Xcode (https://developer.apple.com/xcode/) is not installed.'
                    : `Xcode version ${e.IDEs.Xcode.version} is installed at "${e.IDEs.Xcode.path}".`;
                  return {
                    hasProblem,
                    message,
                  };
                },
              },
              {
                key: 'ios.xcode-select',
                label: 'xcode-select set',
                isRequired: true,
                run: async (_: EnvironmentInfo) => {
                  const result = await tryExecuteCommand('xcode-select -p');
                  const hasProblem = result.hasProblem;
                  const message = hasProblem
                    ? `Xcode version is not selected. You can select it using command "sudo xcode-select -switch <path/to/>Xcode.app". ${result.message}.`
                    : `Xcode version is selected. ${result.message}.`;
                  return {
                    hasProblem,
                    message,
                  };
                },
              },
              {
                key: 'ios.instruments',
                label: 'Instruments exists',
                isRequired: true,
                run: async (_: EnvironmentInfo) => {
                  const result = await tryExecuteCommand('which instruments');
                  const hasProblem = result.hasProblem;
                  const message = hasProblem
                    ? `Instruments not found. Please try to re-install Xcode (https://developer.apple.com/xcode/). ${result.message}.`
                    : `Instruments are installed. ${result.message}.`;
                  return {
                    hasProblem,
                    message,
                  };
                },
              },
            ],
          }
        : {
            isSkipped: true,
            skipReason: `Healthcheck is skipped, because iOS development is not supported on the current platform "${process.platform}".`,
          }),
    },
  };
}

export async function runHealthchecks(): Promise<
  Array<CategoryResult | SkippedHealthcheckCategory>
> {
  const environmentInfo = await getEnvInfo();
  const healthchecks: Healthchecks = getHealthchecks();
  const results: Array<
    CategoryResult | SkippedHealthcheckCategory
  > = await Promise.all(
    Object.entries(healthchecks).map(async ([key, category]) => {
      if (category.isSkipped) {
        return category;
      }
      const categoryResult: CategoryResult = [
        key,
        {
          label: category.label,
          results: await Promise.all(
            category.healthchecks.map(
              async ({key, label, run, isRequired}) => ({
                key,
                label,
                isRequired: isRequired ?? true,
                result: await run(environmentInfo).catch((e) => {
                  console.error(e);
                  // TODO Improve result type to be: OK | Problem(message, fix...)
                  return {
                    hasProblem: true,
                  };
                }),
              }),
            ),
          ),
        },
      ];
      return categoryResult;
    }),
  );
  return results;
}

async function tryExecuteCommand(
  command: string,
): Promise<HealthCheckRunResult> {
  try {
    const output = await promisify(exec)(command);
    return {
      hasProblem: false,
      message: `Command "${command}" successfully executed with output: ${output.stdout}`,
    };
  } catch (err) {
    return {
      hasProblem: true,
      message: `Command "${command}" failed to execute with output: ${err.message}`,
    };
  }
}

async function isWatchmanAvailable(): Promise<boolean> {
  const client = new watchman.Client();
  return new Promise((resolve) => {
    const complete = (result: boolean) => {
      resolve(result);
      client.removeAllListeners('error');
      client.end();
    };
    client.once('error', () => complete(false));
    client.capabilityCheck(
      {optional: [], required: ['relative_root']},
      (error) => {
        if (error) {
          complete(false);
          return;
        }
        complete(true);
      },
    );
  });
}
