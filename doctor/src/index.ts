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
export {getEnvInfo} from './environmentInfo';
import * as watchman from 'fb-watchman';

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
  label: string;
  isRequired?: boolean;
  run: (
    env: EnvironmentInfo,
  ) => Promise<{
    hasProblem: boolean;
    helpUrl?: string;
  }>;
};

export type CategoryResult = [
  string,
  {
    label: string;
    results: Array<{
      label: string;
      isRequired: boolean;
      result: {hasProblem: boolean};
    }>;
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
          label: 'OpenSSL Installed',
          run: async (_: EnvironmentInfo) => {
            const isAvailable = await commandSucceeds('openssl version');
            return {
              hasProblem: !isAvailable,
            };
          },
        },
        {
          label: 'Watchman Installed',
          run: async (_: EnvironmentInfo) => {
            const isAvailable = await isWatchmanAvailable();
            return {
              hasProblem: !isAvailable,
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
          label: 'SDK Installed',
          isRequired: true,
          run: async (e: EnvironmentInfo) => ({
            hasProblem: e.SDKs['Android SDK'] === 'Not Found',
          }),
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
                label: 'SDK Installed',
                isRequired: true,
                run: async (e: EnvironmentInfo) => ({
                  hasProblem: e.SDKs['iOS SDK'].Platforms.length === 0,
                }),
              },
              {
                label: 'XCode Installed',
                isRequired: true,
                run: async (e: EnvironmentInfo) => ({
                  hasProblem: e.IDEs == null || e.IDEs.Xcode == null,
                }),
              },
              {
                label: 'xcode-select set',
                isRequired: true,
                run: async (_: EnvironmentInfo) => ({
                  hasProblem: !(await commandSucceeds('xcode-select -p')),
                }),
              },
              {
                label: 'Instruments exists',
                isRequired: true,
                run: async (_: EnvironmentInfo) => {
                  const hasInstruments = await commandSucceeds(
                    'which instruments',
                  );

                  return {
                    hasProblem: !hasInstruments,
                  };
                },
              },
            ],
          }
        : {
            isSkipped: true,
            skipReason: `Healthcheck is skipped, because iOS development is not supported on the current platform "${process.platform}"`,
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
            category.healthchecks.map(async ({label, run, isRequired}) => ({
              label,
              isRequired: isRequired ?? true,
              result: await run(environmentInfo).catch(e => {
                console.error(e);
                // TODO Improve result type to be: OK | Problem(message, fix...)
                return {
                  hasProblem: true,
                };
              }),
            })),
          ),
        },
      ];
      return categoryResult;
    }),
  );
  return results;
}

async function commandSucceeds(command: string): Promise<boolean> {
  return await promisify(exec)(command)
    .then(() => true)
    .catch(() => false);
}

async function isWatchmanAvailable(): Promise<boolean> {
  const client = new watchman.Client();
  return new Promise(resolve => {
    const complete = (result: boolean) => {
      resolve(result);
      client.removeAllListeners('error');
      client.end();
    };
    client.once('error', () => complete(false));
    client.capabilityCheck(
      {optional: [], required: ['relative_root']},
      error => {
        if (error) {
          complete(false);
          return;
        }
        complete(true);
      },
    );
  });
}
