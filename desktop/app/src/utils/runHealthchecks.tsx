/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {HealthcheckResult} from '../reducers/healthchecks';
import {getHealthchecks, getEnvInfo, Healthchecks} from 'flipper-doctor';
import {logPlatformSuccessRate, reportPlatformFailures} from '../utils/metrics';

let healthcheckIsRunning: boolean;
let runningHealthcheck: Promise<void>;

export type HealthcheckEventsHandler = {
  updateHealthcheckResult: (
    categoryKey: string,
    itemKey: string,
    result: HealthcheckResult,
  ) => void;
  startHealthchecks: (healthchecks: Healthchecks) => void;
  finishHealthchecks: () => void;
};

export type HealthcheckSettings = {
  settings: {
    enableAndroid: boolean;
    enableIOS: boolean;
    enablePhysicalIOS: boolean;
    idbPath: string;
  };
};

export type HealthcheckOptions = HealthcheckEventsHandler & HealthcheckSettings;

async function launchHealthchecks(options: HealthcheckOptions): Promise<void> {
  const healthchecks = getHealthchecks();
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
  options.startHealthchecks(healthchecks);
  const environmentInfo = await getEnvInfo();
  let hasProblems = false;
  for (const [categoryKey, category] of Object.entries(healthchecks)) {
    if (category.isSkipped) {
      continue;
    }
    for (const h of category.healthchecks) {
      const checkResult = await h.run(environmentInfo, options.settings);
      const metricName = `doctor:${h.key.replace('.', ':')}.healthcheck`; // e.g. "doctor:ios:xcode-select.healthcheck"
      if (checkResult.hasProblem) {
        hasProblems = true;
        logPlatformSuccessRate(metricName, {
          kind: 'failure',
          supportedOperation: true,
          error: null,
        });
      } else {
        logPlatformSuccessRate(metricName, {
          kind: 'success',
        });
      }
      const result: HealthcheckResult =
        checkResult.hasProblem && h.isRequired
          ? {
              status: 'FAILED',
              message: checkResult.message,
            }
          : checkResult.hasProblem && !h.isRequired
          ? {
              status: 'WARNING',
              message: checkResult.message,
            }
          : {status: 'SUCCESS', message: checkResult.message};
      options.updateHealthcheckResult(categoryKey, h.key, result);
    }
  }
  options.finishHealthchecks();
  if (hasProblems) {
    logPlatformSuccessRate('doctor.healthcheck', {
      kind: 'failure',
      supportedOperation: true,
      error: null,
    });
  } else {
    logPlatformSuccessRate('doctor.healthcheck', {
      kind: 'success',
    });
  }
}

export default async function runHealthchecks(
  options: HealthcheckOptions,
): Promise<void> {
  if (healthcheckIsRunning) {
    return runningHealthcheck;
  }
  runningHealthcheck = reportPlatformFailures(
    launchHealthchecks(options),
    'doctor:runHealthchecks',
  );
  return runningHealthcheck;
}
