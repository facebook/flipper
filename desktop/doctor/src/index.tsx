/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import {getEnvInfo} from './environmentInfo';
export {getEnvInfo} from './environmentInfo';

import * as watchman from 'fb-watchman';
import * as fs from 'fs';
import * as path from 'path';
import type {FlipperDoctor} from 'flipper-common';
import * as fs_extra from 'fs-extra';
import {
  getIdbInstallationInstructions,
  installXcode,
  installSDK,
  installAndroidStudio,
} from './fb-stubs/messages';
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
            const hasProblem = result.hasProblem;
            return {
              hasProblem,
              message: 'moved to message2',
              message2: hasProblem
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
              message: 'moved to message2',
              message2: isAvailable
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

                  const message = hasProblem
                    ? installAndroidStudio
                    : `Android Studio is installed.`;

                  return {
                    hasProblem,
                    message,
                    message2: hasProblem
                      ? ['android.android-studio--not_installed']
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
            const androidSdkRoot = process.env.ANDROID_SDK_ROOT;

            let androidHomeResult: FlipperDoctor.HealthcheckRunResult;
            if (!androidHome) {
              androidHomeResult = {
                hasProblem: true,
                message: `ANDROID_HOME is not defined. You can use Flipper Settings (More > Settings) to point to its location.`,
                message2: ['android.sdk--no_ANDROID_HOME'],
              };
            } else if (!fs.existsSync(androidHome)) {
              androidHomeResult = {
                hasProblem: true,
                message: `ANDROID_HOME point to a folder which does not exist: ${androidHome}. You can use Flipper Settings (More > Settings) to point to a different location.`,
                message2: ['android.sdk--invalid_ANDROID_HOME'],
              };
            } else {
              const platformToolsDir = path.join(androidHome, 'platform-tools');
              if (!fs.existsSync(platformToolsDir)) {
                androidHomeResult = {
                  hasProblem: true,
                  message: `Android SDK Platform Tools not found at the expected location "${platformToolsDir}". Probably they are not installed.`,
                  message2: ['android.sdk--no_ANDROID_SDK_ROOT'],
                };
              } else {
                androidHomeResult = await tryExecuteCommand(
                  `"${path.join(platformToolsDir, 'adb')}" version`,
                );
              }
            }
            if (androidHomeResult.hasProblem == false) {
              return androidHomeResult;
            }

            let androidSdkRootResult: FlipperDoctor.HealthcheckRunResult;
            if (!androidSdkRoot) {
              androidSdkRootResult = {
                hasProblem: true,
                message: `ANDROID_SDK_ROOT is not defined. You can use Flipper Settings (More > Settings) to point to its location.`,
                message2: ['android.sdk--no_ANDROID_SDK_ROOT'],
              };
            } else if (!fs.existsSync(androidSdkRoot)) {
              androidSdkRootResult = {
                hasProblem: true,
                message: `ANDROID_SDK_ROOT point to a folder which does not exist: ${androidSdkRoot}. You can use Flipper Settings (More > Settings) to point to a different location.`,
                message2: ['android.sdk--unexisting_folder_ANDROID_SDK_ROOT'],
              };
            } else {
              const platformToolsDir = path.join(
                androidSdkRoot,
                'platform-tools',
              );
              if (!fs.existsSync(platformToolsDir)) {
                androidSdkRootResult = {
                  hasProblem: true,
                  message: `Android SDK Platform Tools not found at the expected location "${platformToolsDir}". Probably they are not installed.`,
                  message2: ['android.sdk--no_ANDROID_SDK_ROOT'],
                };
              } else {
                androidSdkRootResult = await tryExecuteCommand(
                  `"${path.join(platformToolsDir, 'adb')}" version`,
                );
              }
            }
            return androidSdkRootResult;
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
                  const hasProblem = e.IDEs == null || e.IDEs.Xcode == null;
                  const message = hasProblem
                    ? `Xcode is not installed.\n${installXcode}.`
                    : `Xcode version ${e.IDEs.Xcode.version} is installed at "${e.IDEs.Xcode.path}".`;
                  return {
                    hasProblem,
                    message,
                    message2: hasProblem
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
                  const result = await tryExecuteCommand('xcode-select -p');
                  const selectXcodeCommands = [
                    {
                      title: 'Select Xcode version',
                      command: `sudo xcode-select -switch <path/to/>Xcode.app`,
                    },
                  ];
                  if (result.hasProblem) {
                    return {
                      hasProblem: true,
                      message: `Xcode version is not selected. ${result.message}.`,
                      commands: selectXcodeCommands,
                      message2: [
                        'ios.xcode-select--not_set',
                        {message: result.message},
                      ],
                    };
                  }
                  const selectedXcode = result.stdout.toString().trim();
                  if (selectedXcode == '/Library/Developer/CommandLineTools') {
                    return {
                      hasProblem: true,
                      message: `xcode-select has no Xcode selected.`,
                      commands: selectXcodeCommands,
                      message2: ['ios.xcode-select--no_xcode_selected'],
                    };
                  }
                  if ((await fs_extra.pathExists(selectedXcode)) == false) {
                    return {
                      hasProblem: true,
                      message: `xcode-select has path of ${selectedXcode}, however this path does not exist on disk.`,
                      commands: selectXcodeCommands,
                      message2: [
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
                    message: `xcode-select has path of ${selectedXcode}.`,
                    message2: [
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
                  const message = hasProblem
                    ? `iOS SDK is not installed. ${installSDK}`
                    : `iOS SDK is installed for the following platforms: ${JSON.stringify(
                        e.SDKs['iOS SDK'].Platforms,
                      )}.`;
                  return {
                    hasProblem,
                    message,
                    message2: hasProblem
                      ? ['ios.sdk--not_installed']
                      : ['ios.sdk--installed'],
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
                  const hasProblem = result.hasProblem;
                  const message = hasProblem
                    ? `xctrace is not available. Please ensure you have Xcode installed and are running a recent version (https://developer.apple.com/xcode/). ${result.message}.`
                    : `xctrace is available. ${result.message}.`;
                  return {
                    hasProblem,
                    message,
                    message2: hasProblem
                      ? ['ios.xctrace--not_installed']
                      : ['ios.xctrace--installed'],
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
                      message:
                        'Not enough context to check IDB installation. Needs to be run through Flipper UI.',
                      message2: ['ios.idb--no_context'],
                    };
                  }
                  if (!settings.enablePhysicalIOS) {
                    return {
                      hasProblem: false,
                      message:
                        'Using physical iOS devices is disabled in settings. So IDB is not required.',
                      message2: ['ios.idb--physical_device_disabled'],
                    };
                  }
                  const result = await tryExecuteCommand(
                    `${settings?.idbPath} --help`,
                  );
                  if (result.hasProblem) {
                    return {
                      hasProblem: true,
                      ...getIdbInstallationInstructions(settings.idbPath),
                      message2: [
                        'ios.idb--not_installed',
                        {idbPath: settings.idbPath},
                      ],
                    };
                  }

                  return {
                    hasProblem: false,
                    message:
                      'Flipper is configured to use your IDB installation.',
                    message2: ['ios.idb--installed'],
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
): Promise<FlipperDoctor.SubprocessHealtcheckRunResult> {
  try {
    const output = await promisify(exec)(command);
    return {
      hasProblem: false,
      message: `Command "${command}" successfully executed with output: ${output.stdout}`,
      stdout: output.stdout,
      message2: ['command-success', {command, stdout: output.stdout}],
    };
  } catch (err) {
    return {
      hasProblem: true,
      message: `Command "${command}" failed to execute with output: ${err.message}`,
      message2: ['command-fail', {command, error: err.message}],
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
