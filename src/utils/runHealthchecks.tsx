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
  HealthcheckReportItem,
  HealthcheckReportCategory,
} from '../reducers/healthchecks';
import {getHealthchecks, getEnvInfo} from 'flipper-doctor';

let healthcheckIsRunning: boolean;
let runningHealthcheck: Promise<boolean>;

export type HealthcheckEventsHandler = {
  initHealthcheckReport: (report: HealthcheckReport) => void;
  updateHealthcheckReportItem: (
    categoryIdx: number,
    itemIdx: number,
    item: HealthcheckReportItem,
  ) => void;
  startHealthchecks: () => void;
  finishHealthchecks: () => void;
};

async function launchHealthchecks(
  dispatch: HealthcheckEventsHandler,
): Promise<boolean> {
  let hasProblems: boolean = true;
  dispatch.startHealthchecks();
  try {
    const initialState: HealthcheckResult = {
      status: 'IN_PROGRESS',
      message: 'The healthcheck is in progress',
    };
    const hcState: HealthcheckReport = {
      isHealthcheckInProgress: true,
      categories: Object.values(getHealthchecks())
        .map(category => {
          if (!category) {
            return null;
          }
          return {
            ...initialState,
            label: category.label,
            checks: category.healthchecks.map(x => ({
              ...initialState,
              label: x.label,
            })),
          };
        })
        .filter(x => !!x)
        .map(x => x as HealthcheckReportCategory),
    };
    dispatch.initHealthcheckReport(hcState);
    const environmentInfo = await getEnvInfo();
    const categories = Object.values(getHealthchecks());
    for (let cIdx = 0; cIdx < categories.length; cIdx++) {
      const c = categories[cIdx];
      if (!c) {
        continue;
      }
      for (let hIdx = 0; hIdx < c.healthchecks.length; hIdx++) {
        const h = c.healthchecks[hIdx];
        const result = await h.run(environmentInfo);
        if (result.hasProblem) {
          hasProblems = false;
        }
        dispatch.updateHealthcheckReportItem(cIdx, hIdx, {
          ...h,
          ...(result.hasProblem && h.isRequired
            ? {
                status: 'FAILED',
                message: 'The healthcheck failed',
                helpUrl: result.helpUrl,
              }
            : result.hasProblem && !h.isRequired
            ? {
                status: 'WARNING',
                message: 'Doctor discovered a problem during the healthcech',
                helpUrl: result.helpUrl,
              }
            : {
                status: 'SUCCESS',
                message: 'The healthcheck completed succesfully',
              }),
        });
      }
    }
  } catch {
  } finally {
    dispatch.finishHealthchecks();
  }
  return hasProblems;
}

export default async function runHealthchecks(
  dispatch: HealthcheckEventsHandler,
): Promise<boolean> {
  if (healthcheckIsRunning) {
    return runningHealthcheck;
  }
  runningHealthcheck = launchHealthchecks(dispatch);
  return runningHealthcheck;
}
