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
export {getEnvInfo} from './environmentInfo';

import * as watchman from 'fb-watchman';
import * as fs from 'fs';
import * as path from 'path';
import type {FlipperDoctor} from 'flipper-common';
import * as fs_extra from 'fs-extra';
import {validateSelectedXcodeVersion} from './fb-stubs/validateSelectedXcodeVersion';

export function getHealthchecks(
  isProduction: boolean,
): FlipperDoctor.Healthchecks {
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

        ...(!isProduction
          ? [
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
              } as FlipperDoctor.Healthcheck,
            ]
          : []),
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
                  // eslint-disable-next-line node/no-sync
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
              // eslint-disable-next-line node/no-sync
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
              // eslint-disable-next-line node/no-sync
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
                key: 'ios.idb',
                label: 'IDB installed',
                isRequired: true,
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
                    const hasIdbCompanion = await tryExecuteCommand(
                      'which idb_companion',
                    );

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
                  const subchecks: FlipperDoctor.HealthcheckRunSubcheck[] = [];
                  const allApps =
                    await fs_extra.promises.readdir('/Applications');
                  // Xcode_14.2.0_xxxxxxx.app
                  // Xcode_14.3.1_xxxxxxxxxx.app
                  // Xcode_15.0.0_xxxxxxxxxx.app
                  // Xcode.app
                  const latestXCode = allApps
                    .filter((a) => a.startsWith('Xcode'))
                    .sort()
                    .pop();
                  const availableXcode = latestXCode
                    ? path.join('/Applications', latestXCode)
                    : null;
                  subchecks.push({
                    status: availableXcode ? 'ok' : 'fail',
                    title: 'Xcode in /Applications',
                  });

                  const result = await tryExecuteCommand('xcode-select -p');
                  subchecks.push({
                    status: result.fail ? 'fail' : 'ok',
                    title: 'xcode-select runs successfully',
                  });
                  if (result.fail) {
                    return {
                      hasProblem: true,
                      subchecks,
                      message: [
                        'ios.xcode-select--not_set',
                        {message: result.message, availableXcode},
                      ],
                    };
                  }

                  const selectedXcode = result.stdout.toString().trim();
                  const isSelectedXcodeCommandLineTools =
                    selectedXcode == '/Library/Developer/CommandLineTools';
                  subchecks.push({
                    status: isSelectedXcodeCommandLineTools ? 'fail' : 'ok',
                    title:
                      'xcode-select does NOT point to "/Library/Developer/CommandLineTools"',
                  });
                  if (isSelectedXcodeCommandLineTools) {
                    return {
                      hasProblem: true,
                      subchecks,
                      message: [
                        'ios.xcode-select--no_xcode_selected',
                        {availableXcode},
                      ],
                    };
                  }

                  const selectedXcodeExists =
                    await fs_extra.pathExists(selectedXcode);
                  subchecks.push({
                    status: selectedXcodeExists ? 'ok' : 'fail',
                    title: 'Selected Xcode exists',
                  });
                  if (!selectedXcodeExists) {
                    return {
                      hasProblem: true,
                      subchecks,
                      message: [
                        'ios.xcode-select--nonexisting_selected',
                        {selected: selectedXcode, availableXcode},
                      ],
                    };
                  }
                  const validatedXcodeVersion =
                    await validateSelectedXcodeVersion(
                      selectedXcode,
                      availableXcode,
                      subchecks,
                    );
                  if (validatedXcodeVersion.hasProblem) {
                    return {
                      ...validatedXcodeVersion,
                      subchecks,
                    };
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
                key: 'ios.has-simulators',
                label: 'Simulators are available',
                isRequired: true,
                run: async (
                  _e: FlipperDoctor.EnvironmentInfo,
                  settings?: {enablePhysicalIOS: boolean; idbPath: string},
                ): Promise<FlipperDoctor.HealthcheckRunResult> => {
                  const result = await tryExecuteCommand(
                    `${settings?.idbPath ?? 'idb'} list-targets --json`,
                  );
                  if (result.fail) {
                    return {
                      hasProblem: true,
                      message: [
                        'ios.has-simulators--idb-failed',
                        {message: result.message},
                      ],
                    };
                  }

                  const devices = result.stdout
                    .trim()
                    .split('\n')
                    .map((x) => {
                      try {
                        return JSON.parse(x);
                      } catch (e) {
                        return null;
                      }
                    })
                    .filter((x) => x != null && x.type === 'simulator');

                  if (devices.length === 0) {
                    return {
                      hasProblem: true,
                      message: ['ios.has-simulators--no-devices'],
                    };
                  }

                  return {
                    hasProblem: false,
                    message: [
                      'ios.has-simulators--ok',
                      {count: devices.length},
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
            ],
          }
        : {
            isSkipped: true,
            skipReason: `Healthcheck is skipped, because iOS development is not supported on the current platform "${process.platform}".`,
          }),
    },
  };
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
