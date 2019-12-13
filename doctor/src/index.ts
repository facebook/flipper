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

type HealthcheckCategory = {
  label: string;
  isRequired: boolean;
  healthchecks: Healthcheck[];
};

type Healthchecks = {
  common: HealthcheckCategory;
  android: HealthcheckCategory;
  ios?: HealthcheckCategory;
};

type Healthcheck = {
  label: string;
  isRequired?: boolean;
  run: (
    env: EnvironmentInfo,
  ) => Promise<{
    hasProblem: boolean;
    helpUrl?: string;
  }>;
};

type CategoryResult = [
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
      ],
    },
    android: {
      label: 'Android',
      isRequired: false,
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
    ...(process.platform === 'darwin'
      ? {
          ios: {
            label: 'iOS',
            isRequired: false,
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
          },
        }
      : {}),
  };
}

export async function runHealthchecks(): Promise<Array<CategoryResult>> {
  const environmentInfo = await getEnvInfo();
  const healthchecks: Healthchecks = getHealthchecks();
  const results: Array<CategoryResult> = (
    await Promise.all(
      Object.entries(healthchecks).map(async ([key, category]) => {
        if (!category) {
          return null;
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
    )
  ).filter(notNull);
  return results;
}

async function commandSucceeds(command: string): Promise<boolean> {
  return await promisify(exec)(command)
    .then(() => true)
    .catch(() => false);
}

export function notNull<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
