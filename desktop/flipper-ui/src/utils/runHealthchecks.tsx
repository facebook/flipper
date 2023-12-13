/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  logPlatformSuccessRate,
  reportPlatformFailures,
  FlipperDoctor,
} from 'flipper-common';
import {getFlipperServer} from '../flipperServer';

let healthcheckIsRunning: boolean;
let runningHealthcheck: Promise<void>;

export type HealthcheckEventsHandler = {
  updateHealthcheckResult: (
    categoryKey: string,
    itemKey: string,
    result: FlipperDoctor.HealthcheckResult,
  ) => void;
  startHealthchecks: (healthchecks: FlipperDoctor.Healthchecks) => void;
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
  const flipperServer = getFlipperServer();
  const healthchecks = await flipperServer.exec('doctor-get-healthchecks', {
    settings: options.settings,
  });
  options.startHealthchecks(healthchecks);
  let hasProblems = false;
  await Promise.all(
    Object.entries(healthchecks).map(async ([categoryKey, category]) => {
      if (category.isSkipped) {
        return;
      }
      await Promise.all(
        category.healthchecks.map(async (h) => {
          const checkResult: FlipperDoctor.HealthcheckResult =
            await flipperServer
              .exec(
                'doctor-run-healthcheck',
                {settings: options.settings},
                categoryKey as keyof FlipperDoctor.Healthchecks,
                h.key,
              )
              .catch((e) => {
                console.warn('Failed to run doctor check', e);
                return {
                  status: 'FAILED',
                  isAcknowledged: false,
                  message: ['doctor-failed', {error: e}],
                };
              });
          const metricName = `doctor:${h.key.replace('.', ':')}.healthcheck`; // e.g. "doctor:ios:xcode-select.healthcheck"
          if (checkResult.status !== 'SUCCESS') {
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
          options.updateHealthcheckResult(categoryKey, h.key, checkResult);
        }),
      );
    }),
  );
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
