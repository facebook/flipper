/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  HealthcheckResult,
  HealthcheckReport,
  HealthcheckReportCategory,
} from '../reducers/healthchecks';
import {getHealthchecks, getEnvInfo} from 'flipper-doctor';

let healthcheckIsRunning: boolean;
let runningHealthcheck: Promise<boolean>;

export type HealthcheckEventsHandler = {
  initHealthcheckReport: (report: HealthcheckReport) => void;
  updateHealthcheckReportItemStatus: (
    categoryIdx: number,
    itemIdx: number,
    status: HealthcheckResult,
  ) => void;
  updateHealthcheckReportCategoryStatus: (
    categoryIdx: number,
    status: HealthcheckResult,
  ) => void;
  startHealthchecks: () => void;
  finishHealthchecks: () => void;
};

export type HealthcheckSettings = {
  enableAndroid: boolean;
};

export type HealthcheckOptions = HealthcheckEventsHandler & HealthcheckSettings;

async function launchHealthchecks(
  options: HealthcheckOptions,
): Promise<boolean> {
  let healthchecksResult: boolean = true;
  options.startHealthchecks();
  try {
    const inProgressResult: HealthcheckResult = {
      status: 'IN_PROGRESS',
      message: 'The healthcheck is in progress',
    };
    const androidSkippedResult: HealthcheckResult = {
      status: 'SKIPPED',
      message:
        'The healthcheck was skipped because Android development is disabled in the Flipper settings',
    };
    const failedResult: HealthcheckResult = {
      status: 'FAILED',
      message: 'The healthcheck failed',
    };
    const warningResult: HealthcheckResult = {
      status: 'WARNING',
      message: 'The optional healthcheck failed',
    };
    const succeededResult: HealthcheckResult = {
      status: 'SUCCESS',
      message: undefined,
    };
    const healthchecks = getHealthchecks();
    const hcState: HealthcheckReport = {
      isHealthcheckInProgress: true,
      categories: Object.entries(healthchecks)
        .map(([categoryKey, category]) => {
          if (!category) {
            return null;
          }
          const state: HealthcheckResult =
            categoryKey === 'android' && !options.enableAndroid
              ? androidSkippedResult
              : inProgressResult;
          return {
            ...state,
            label: category.label,
            checks: category.healthchecks.map(x => ({
              ...state,
              label: x.label,
            })),
          };
        })
        .filter(x => !!x)
        .map(x => x as HealthcheckReportCategory),
    };
    options.initHealthcheckReport(hcState);
    const environmentInfo = await getEnvInfo();
    const categories = Object.entries(healthchecks);
    for (const [categoryIdx, [categoryKey, category]] of categories.entries()) {
      if (!category) {
        continue;
      }
      const isSkippedAndroidCategory =
        categoryKey === 'android' && !options.enableAndroid;
      const allResults: HealthcheckResult[] = [];
      for (
        let healthcheckIdx = 0;
        healthcheckIdx < category.healthchecks.length;
        healthcheckIdx++
      ) {
        const h = category.healthchecks[healthcheckIdx];
        if (isSkippedAndroidCategory) {
          options.updateHealthcheckReportItemStatus(
            categoryIdx,
            healthcheckIdx,
            androidSkippedResult,
          );
          allResults.push(androidSkippedResult);
        } else {
          const result = await h.run(environmentInfo);
          if (result.hasProblem && h.isRequired) {
            healthchecksResult = false;
          }
          const status: HealthcheckResult =
            result.hasProblem && h.isRequired
              ? {
                  ...failedResult,
                  helpUrl: result.helpUrl,
                }
              : result.hasProblem && !h.isRequired
              ? {
                  ...warningResult,
                  helpUrl: result.helpUrl,
                }
              : succeededResult;
          options.updateHealthcheckReportItemStatus(
            categoryIdx,
            healthcheckIdx,
            status,
          );
          allResults.push(status);
        }
      }
      const categoryStatus = {
        label: category.label,
        ...(allResults.some(c => c.status === 'IN_PROGRESS')
          ? inProgressResult
          : allResults.every(c => c.status === 'SUCCESS')
          ? succeededResult
          : allResults.every(c => c.status === 'SKIPPED')
          ? androidSkippedResult
          : allResults.some(c => c.status === 'FAILED')
          ? failedResult
          : warningResult),
      };
      options.updateHealthcheckReportCategoryStatus(
        categoryIdx,
        categoryStatus,
      );
    }
  } catch {
  } finally {
    options.finishHealthchecks();
  }
  return healthchecksResult;
}

export default async function runHealthchecks(
  options: HealthcheckOptions,
): Promise<boolean> {
  if (healthcheckIsRunning) {
    return runningHealthcheck;
  }
  runningHealthcheck = launchHealthchecks(options);
  return runningHealthcheck;
}
