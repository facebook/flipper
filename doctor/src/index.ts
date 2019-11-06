/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {EnvironmentInfo} from './environmentInfo';

type HealthcheckCategory = {
  label: string;
  healthchecks: Healthcheck[];
};

type Healthchecks = {
  android: HealthcheckCategory;
  ios?: HealthcheckCategory;
};

type Healthcheck = {
  label: string;
  run: (
    env: EnvironmentInfo,
  ) => {
    hasProblem: boolean;
    isRequired?: boolean;
  };
};

export function getHealthchecks(): Healthchecks {
  return {
    android: {
      label: 'Android',
      healthchecks: [
        {
          label: 'SDK Installed',
          run: (e: EnvironmentInfo) => ({
            hasProblem: e.SDKs['Android SDK'] != 'Not Found',
            isRequired: false,
          }),
        },
      ],
    },
    ...(process.platform === 'darwin'
      ? {
          ios: {
            label: 'iOS',
            healthchecks: [
              {
                label: 'SDK Installed',
                run: (e: EnvironmentInfo) => ({
                  hasProblem: e.SDKs['iOS SDK'].Platforms.length === 0,
                  isRequired: false,
                }),
              },
            ],
          },
        }
      : {}),
  };
}
