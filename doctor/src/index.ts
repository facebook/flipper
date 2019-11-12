/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getEnvInfo, EnvironmentInfo} from './environmentInfo';
export {getEnvInfo} from './environmentInfo';
import {exec} from 'child_process';
import {promisify} from 'util';

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
  }>;
};

export function getHealthchecks(): Healthchecks {
  return {
    common: {
      label: 'Common',
      isRequired: true,
      healthchecks: [
        {
          label: 'OpenSSL Installed',
          isRequired: true,
          run: async (_: EnvironmentInfo) => {
            const isAvailable = await promisify(exec)('openssl version')
              .then(() => true)
              .catch(() => false);
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
                  hasProblem:
                    (await promisify(exec)('xcode-select -p')).stdout.trim()
                      .length < 1,
                }),
              },
              {
                label: 'Instruments exists',
                isRequired: true,
                run: async (_: EnvironmentInfo) => {
                  const hasInstruments = await promisify(exec)(
                    'which instruments',
                  )
                    .then(_ => true)
                    .catch(_ => false);

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

export async function runHealthchecks() {
  const environmentInfo = await getEnvInfo();
  const healthchecks = getHealthchecks();
  const results = await Promise.all(
    Object.entries(healthchecks).map(async ([key, category]) => [
      key,
      category
        ? {
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
          }
        : {},
    ]),
  );
  return results;
}
