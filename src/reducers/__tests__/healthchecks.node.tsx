/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  default as reducer,
  initHealthcheckReport,
  startHealthchecks,
  HealthcheckReportCategory,
  HealthcheckReportItem,
  finishHealthchecks,
  updateHealthcheckReportItemStatus,
  updateHealthcheckReportCategoryStatus,
} from '../healthchecks';

const HEALTHCHECK_ITEM: HealthcheckReportItem = {
  label: 'Test Check',
  status: 'WARNING',
  message: "Something didn't quite work.",
};

const HEALTHCHECK_CATEGORY: HealthcheckReportCategory = {
  label: 'Test Category',
  status: 'WARNING',
  checks: [HEALTHCHECK_ITEM],
};

test('initHealthcheckReport', () => {
  const report = {
    isHealthcheckInProgress: false,
    categories: [],
  };
  const res = reducer(undefined, initHealthcheckReport(report));
  expect(res.healthcheckReport).toEqual(report);
});

test('startHealthCheck', () => {
  const report = {
    isHealthcheckInProgress: false,
    categories: [HEALTHCHECK_CATEGORY],
  };
  let res = reducer(undefined, initHealthcheckReport(report));
  res = reducer(res, startHealthchecks());
  expect(res.healthcheckReport.isHealthcheckInProgress).toBeTruthy();
  // This seems trivial, but by getting the spread wrong, it's easy
  // to break this.
  expect(res.healthcheckReport.categories).toEqual([HEALTHCHECK_CATEGORY]);
});

test('finish', () => {
  const report = {
    isHealthcheckInProgress: true,
    categories: [HEALTHCHECK_CATEGORY],
  };
  let res = reducer(undefined, initHealthcheckReport(report));
  res = reducer(res, finishHealthchecks());
  expect(res.healthcheckReport.isHealthcheckInProgress).toBeFalsy();
  expect(res.healthcheckReport.categories).toEqual([HEALTHCHECK_CATEGORY]);
});

test('updateHealthcheck', () => {
  const report = {
    isHealthcheckInProgress: true,
    categories: [HEALTHCHECK_CATEGORY, HEALTHCHECK_CATEGORY],
  };
  let res = reducer(undefined, initHealthcheckReport(report));
  res = reducer(
    res,
    updateHealthcheckReportItemStatus(0, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  expect(res.healthcheckReport.isHealthcheckInProgress).toBeTruthy();
  expect(res.healthcheckReport.categories[0].checks[0].message).toEqual(
    'Updated Test Message',
  );
  expect(res.healthcheckReport.categories[0].checks[0].status).toEqual(
    'SUCCESS',
  );
  expect(res.healthcheckReport.categories[1].checks[0].label).toEqual(
    'Test Check',
  );
  expect(res.healthcheckReport.categories[1].checks[0].status).toEqual(
    'WARNING',
  );
});

test('updateHealthcheckCategoryStatus', () => {
  const report = {
    isHealthcheckInProgress: true,
    categories: [HEALTHCHECK_CATEGORY, HEALTHCHECK_CATEGORY],
  };
  let res = reducer(undefined, initHealthcheckReport(report));
  res = reducer(
    res,
    updateHealthcheckReportCategoryStatus(1, {
      status: 'FAILED',
      message: 'Error message',
    }),
  );
  expect(res.healthcheckReport.isHealthcheckInProgress).toBeTruthy();
  expect(res.healthcheckReport.categories[0].label).toEqual('Test Category');
  expect(res.healthcheckReport.categories[0].status).toEqual('WARNING');
  expect(res.healthcheckReport.categories[1].label).toEqual('Test Category');
  expect(res.healthcheckReport.categories[1].status).toEqual('FAILED');
  expect(res.healthcheckReport.categories[1].message).toEqual('Error message');
});
