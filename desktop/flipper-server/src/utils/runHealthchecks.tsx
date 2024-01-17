/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getHealthchecks, getEnvInfo} from 'flipper-doctor';
import {FlipperDoctor} from 'flipper-common';
import produce from 'immer';

export async function getHealthChecks(
  options: FlipperDoctor.HealthcheckSettings,
) {
  return produce(getHealthchecks(), (healthchecks) => {
    if (!options.settings.enableAndroid) {
      healthchecks.android = {
        label: healthchecks.android.label,
        isSkipped: true,
        skipReason:
          'Healthcheck is skipped, because "Android Development" option is disabled in the Flipper settings',
      };
    }
    if (!options.settings.enableIOS) {
      healthchecks.ios = {
        label: healthchecks.ios.label,
        isSkipped: true,
        skipReason:
          'Healthcheck is skipped, because "iOS Development" option is disabled in the Flipper settings',
      };
    }
    Object.keys(healthchecks).forEach((cat) => {
      const category = healthchecks[cat as keyof typeof healthchecks];
      if ('healthchecks' in category) {
        category.healthchecks.forEach((h) => {
          delete h.run;
        });
      }
    });
  });
}

export async function runHealthcheck(
  options: FlipperDoctor.HealthcheckSettings,
  categoryName: keyof FlipperDoctor.Healthchecks,
  ruleName: string,
): Promise<FlipperDoctor.HealthcheckResult> {
  const healthchecks = getHealthchecks();
  const category = healthchecks[categoryName];
  if (!category) {
    throw new Error('Unknown category: ' + categoryName);
  }
  if (!('healthchecks' in category)) {
    throw new Error('Skipped category: ' + categoryName);
  }
  const check = category.healthchecks.find((h) => h.key === ruleName);
  if (!check) {
    throw new Error('Unknown healthcheck: ' + ruleName);
  }

  const envInfoPromise = getEnvInfo();
  const environmentInfo = await envInfoPromise;
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const checkResult = await check.run!(environmentInfo, options.settings);
  return checkResult.hasProblem && check.isRequired
    ? {
        status: 'FAILED',
        message: checkResult.message,
      }
    : checkResult.hasProblem && !check.isRequired
      ? {
          status: 'WARNING',
          message: checkResult.message,
        }
      : {
          status: 'SUCCESS',
          message: checkResult.message,
        };
}
