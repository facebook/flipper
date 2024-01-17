/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {exec} from 'child_process';
import os from 'os';
import {promisify} from 'util';
import {getEnvInfo} from './environmentInfo';
export {getEnvInfo} from './environmentInfo';

import * as watchman from 'fb-watchman';
import * as fs from 'fs';
import * as path from 'path';
import type {FlipperDoctor} from 'flipper-common';
import * as fs_extra from 'fs-extra';
import {validateSelectedXcodeVersion} from './fb-stubs/validateSelectedXcodeVersion';

export function getHealthchecks(): FlipperDoctor.Healthchecks {
  return {
    common: {
      label: 'Common',
      isRequired: true,
      isSkipped: false,
      healthchecks: [
        {
          key: 'common.openssl',
          label: 'OpenSSL Installed',
          run: async (_: FlipperDoctor.EnvironmentInfo) => {
            const result = await tryExecuteCommand('openssl version');
            return {
              hasProblem: result.fail,
              message: result.fail
                ? ['common.openssl--not_installed', {output: result.message}]
                : ['common.openssl--installed', {output: result.message}],
            };
          },
        },
        {
          key: 'common.watchman',
          label: 'Watchman Installed',
          run: async (_: FlipperDoctor.EnvironmentInfo) => {
            const isAvailable = await isWatchmanAvailable();
            return {
              hasProblem: !isAvailable,
              message: isAvailable
                ? ['common.watchman--installed']
                : ['common.watchman--not_installed'],
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
        ...(process.platform === 'darwin'
          ? [
              {
                key: 'android.android-studio',
                label: 'Android Studio Installed',
                isRequired: false,
                run: async (
                  _: FlipperDoctor.EnvironmentInfo,
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  const hasProblem = !fs.existsSync(
                    '/Applications/Android Studio.app',
                  );

                  return {
                    hasProblem,
                    message: hasProblem
                      ? [
                          'android.android-studio--not_installed',
                          {platform: os.arch()},
                        ]
                      : ['android.android-studio--installed'],
                  };
                },
              },
            ]
          : []),
        {
          key: 'android.sdk',
          label: 'SDK Installed',
          isRequired: true,
          run: async (
            _: FlipperDoctor.EnvironmentInfo,
          ): Promise<FlipperDoctor.HealthcheckRunResult> => {
            const androidHome = process.env.ANDROID_HOME;

            if (!androidHome) {
              return {
                hasProblem: true,
                message: ['android.sdk--no_ANDROID_HOME'],
              };
            } else if (!fs.existsSync(androidHome)) {
              const androidStudioAndroidHome = `${os.homedir()}/Library/Android/sdk`;
              const globalAndroidHome = '/opt/android_sdk';
              const existingAndroidHome = (await fs_extra.exists(
                androidStudioAndroidHome,
              ))
                ? androidStudioAndroidHome
                : (await fs_extra.exists(globalAndroidHome))
                  ? globalAndroidHome
                  : null;
              return {
                hasProblem: true,
                message: [
                  'android.sdk--invalid_ANDROID_HOME',
                  {androidHome, existingAndroidHome},
                ],
              };
            } else {
              const platformToolsDir = path.join(androidHome, 'platform-tools');
              if (!fs.existsSync(platformToolsDir)) {
                return {
                  hasProblem: true,
                  message: ['android.sdk--no_android_sdk', {platformToolsDir}],
                };
              } else {
                const versionResult = await tryExecuteCommand(
                  `"${path.join(platformToolsDir, 'adb')}" version`,
                );

                if (versionResult.fail === false) {
                  return {
                    hasProblem: false,
                    message: [
                      'android.sdk--installed',
                      {output: versionResult.stdout},
                    ],
                  };
                } else {
                  return {
                    hasProblem: true,
                    message: [
                      'android.sdk--not_installed',
                      {output: versionResult.message},
                    ],
                  };
                }
              }
            }
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
                key: 'ios.xcode',
                label: 'XCode Installed',
                isRequired: true,
                run: async (
                  e: FlipperDoctor.EnvironmentInfo,
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  const hasProblem =
                    e.IDEs == null ||
                    e.IDEs.Xcode == null ||
                    // error/edgecase in EnvironmentInfo
                    e.IDEs.Xcode.version === '/undefined';
                  return {
                    hasProblem,
                    message: hasProblem
                      ? ['ios.xcode--not_installed']
                      : [
                          `ios.xcode--installed`,
                          {
                            version: e.IDEs.Xcode.version,
                            path: e.IDEs.Xcode.path,
                          },
                        ],
                  };
                },
              },
              {
                key: 'ios.xcode-select',
                label: 'xcode-select set',
                isRequired: true,
                run: async (
                  _: FlipperDoctor.EnvironmentInfo,
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  // TODO check for an existing Xcode
                  const result = await tryExecuteCommand('xcode-select -p');
                  if (result.fail) {
                    return {
                      hasProblem: true,
                      message: [
                        'ios.xcode-select--not_set',
                        {message: result.message},
                      ],
                    };
                  }
                  const selectedXcode = result.stdout.toString().trim();
                  if (selectedXcode == '/Library/Developer/CommandLineTools') {
                    return {
                      hasProblem: true,
                      message: ['ios.xcode-select--no_xcode_selected'],
                    };
                  }
                  if ((await fs_extra.pathExists(selectedXcode)) == false) {
                    return {
                      hasProblem: true,
                      message: [
                        'ios.xcode-select--nonexisting_selected',
                        {selected: selectedXcode},
                      ],
                    };
                  }
                  const validatedXcodeVersion =
                    await validateSelectedXcodeVersion(selectedXcode);
                  if (validatedXcodeVersion.hasProblem) {
                    return validatedXcodeVersion;
                  }
                  return {
                    hasProblem: false,
                    message: [
                      'ios.xcode-select--set',
                      {selected: selectedXcode},
                    ],
                  };
                },
              },
              {
                key: 'ios.sdk',
                label: 'SDK Installed',
                isRequired: true,
                run: async (
                  e: FlipperDoctor.EnvironmentInfo,
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  const hasProblem =
                    !e.SDKs['iOS SDK'] ||
                    !e.SDKs['iOS SDK'].Platforms ||
                    !e.SDKs['iOS SDK'].Platforms.length;
                  return {
                    hasProblem,
                    message: hasProblem
                      ? ['ios.sdk--not_installed']
                      : [
                          'ios.sdk--installed',
                          {platforms: e.SDKs['iOS SDK'].Platforms},
                        ],
                  };
                },
              },
              {
                key: 'ios.xctrace',
                label: 'xctrace exists',
                isRequired: true,
                run: async (
                  _: FlipperDoctor.EnvironmentInfo,
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  const result = await tryExecuteCommand(
                    'xcrun xctrace version',
                  );
                  if (result.fail) {
                    return {
                      hasProblem: true,
                      message: [
                        'ios.xctrace--not_installed',
                        {message: result.message.trim()},
                      ],
                    };
                  }
                  return {
                    hasProblem: false,
                    message: [
                      'ios.xctrace--installed',
                      {output: result.stdout.trim()},
                    ],
                  };
                },
              },
              {
                key: 'ios.idb',
                label: 'IDB installed',
                isRequired: false,
                run: async (
                  _: FlipperDoctor.EnvironmentInfo,
                  settings?: {enablePhysicalIOS: boolean; idbPath: string},
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  if (!settings) {
                    return {
                      hasProblem: false,
                      message: ['ios.idb--no_context'],
                    };
                  }
                  if (!settings.enablePhysicalIOS) {
                    return {
                      hasProblem: false,
                      message: ['ios.idb--physical_device_disabled'],
                    };
                  }
                  const result = await tryExecuteCommand(
                    `${settings?.idbPath} --help`,
                  );
                  const hasIdbCompanion =
                    await tryExecuteCommand(`idbCompanion --help`);
                  if (result.fail) {
                    const hasIdbInPath = await tryExecuteCommand(`which idb`);

                    if (!hasIdbInPath.fail) {
                      return {
                        hasProblem: true,
                        message: [
                          'ios.idb--not_installed_but_present',
                          {
                            idbPath: settings.idbPath,
                            idbInPath: hasIdbInPath.stdout.trim(),
                          },
                        ],
                      };
                    }

                    return {
                      hasProblem: true,
                      message: [
                        'ios.idb--not_installed',
                        {
                          idbPath: settings.idbPath,
                          hasIdbCompanion: !hasIdbCompanion.fail,
                        },
                      ],
                    };
                  }

                  return {
                    hasProblem: false,
                    message: ['ios.idb--installed'],
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
  Array<FlipperDoctor.CategoryResult | FlipperDoctor.SkippedHealthcheckCategory>
> {
  const environmentInfo = await getEnvInfo();
  const healthchecks: FlipperDoctor.Healthchecks = getHealthchecks();
  const results: Array<
    FlipperDoctor.CategoryResult | FlipperDoctor.SkippedHealthcheckCategory
  > = await Promise.all(
    Object.entries(healthchecks).map(async ([key, category]) => {
      if (category.isSkipped) {
        return category;
      }
      const categoryResult: FlipperDoctor.CategoryResult = [
        key,
        {
          label: category.label,
          results: await Promise.all(
            category.healthchecks.map(
              async ({key, label, run, isRequired}) => ({
                key,
                label,
                isRequired: isRequired ?? true,
                // TODO: Fix this the next time the file is edited.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                result: await run!(environmentInfo).catch((e) => {
                  console.warn(`Health check ${key}/${label} failed with:`, e);
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
): Promise<
  | {fail: false; message: string; stdout: string}
  | {fail: true; message: string; error: any}
> {
  try {
    const output = await promisify(exec)(command);
    return {
      fail: false,
      message: `Command "${command}" successfully executed with output: ${output.stdout}`,
      stdout: output.stdout,
    };
  } catch (err) {
    return {
      fail: true,
      message: `Command "${command}" failed to execute with output: ${err.message}`,
      error: err,
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
