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
  startHealthchecks,
  finishHealthchecks,
  updateHealthcheckResult,
  acknowledgeProblems,
} from '../healthchecks';
import {Healthchecks} from 'flipper-doctor';
import {EnvironmentInfo} from 'flipper-doctor/lib/environmentInfo';

const HEALTHCHECKS: Healthchecks = {
  ios: {
    label: 'iOS',
    isSkipped: false,
    isRequired: true,
    healthchecks: [
      {
        key: 'ios.sdk',
        label: 'SDK Installed',
        run: async (_env: EnvironmentInfo) => {
          return {hasProblem: false};
        },
      },
    ],
  },
  android: {
    label: 'Android',
    isSkipped: false,
    isRequired: true,
    healthchecks: [
      {
        key: 'android.sdk',
        label: 'SDK Installed',
        run: async (_env: EnvironmentInfo) => {
          return {hasProblem: true};
        },
      },
    ],
  },
  common: {
    label: 'Common',
    isSkipped: false,
    isRequired: false,
    healthchecks: [
      {
        key: 'common.openssl',
        label: 'OpenSSL Istalled',
        run: async (_env: EnvironmentInfo) => {
          return {hasProblem: false};
        },
      },
    ],
  },
};

test('startHealthCheck', () => {
  const res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  expect(res.healthcheckReport.status).toBe('IN_PROGRESS');
  expect(res.healthcheckReport.categories.length).toBe(3);
  expect(res.healthcheckReport.categories[0].status).toEqual('IN_PROGRESS');
  expect(res.healthcheckReport.categories[0].label).toEqual('iOS');
  expect(res.healthcheckReport.categories[0].checks.length).toEqual(1);
  expect(res.healthcheckReport.categories[0].checks[0].label).toEqual(
    'SDK Installed',
  );
  expect(res.healthcheckReport.categories[0].checks[0].status).toEqual(
    'IN_PROGRESS',
  );
});

test('updateHealthcheckResult', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult(0, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  expect(res.healthcheckReport.status).toBe('IN_PROGRESS');
  expect(res.healthcheckReport.categories[0].checks[0].message).toEqual(
    'Updated Test Message',
  );
  expect(res.healthcheckReport.categories[0].checks[0].status).toEqual(
    'SUCCESS',
  );
  expect(res.healthcheckReport.categories[0].status).toEqual('IN_PROGRESS');
  expect(res.healthcheckReport.categories[1].checks[0].message).toBeUndefined();
  expect(res.healthcheckReport.categories[1].checks[0].status).toEqual(
    'IN_PROGRESS',
  );
  expect(res.healthcheckReport.categories[1].status).toEqual('IN_PROGRESS');
});

test('finish', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult(0, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult(1, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult(2, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  res = reducer(res, finishHealthchecks());
  expect(res.healthcheckReport.status).toBe('SUCCESS');
  expect(res.healthcheckReport.categories.map(c => c.status)).toEqual([
    'SUCCESS',
    'SUCCESS',
    'SUCCESS',
  ]);
});

test('statuses updated after healthchecks finished', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult(1, 0, {
      message: 'Updated Test Message',
      status: 'FAILED',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult(0, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult(2, 0, {
      message: 'Updated Test Message',
      status: 'SUCCESS',
    }),
  );
  res = reducer(res, finishHealthchecks());
  expect(res.healthcheckReport.status).toBe('FAILED');
  expect(res.healthcheckReport.categories.map(c => c.status)).toEqual([
    'SUCCESS',
    'FAILED',
    'SUCCESS',
  ]);
  expect(res.healthcheckReport.categories[1].checks[0].message).toEqual(
    'Updated Test Message',
  );
  expect(res.healthcheckReport.categories[1].checks[0].status).toEqual(
    'FAILED',
  );
});

test('acknowledgeProblems', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult(0, 0, {
      status: 'FAILED',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult(1, 0, {
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult(2, 0, {
      status: 'FAILED',
    }),
  );
  res = reducer(res, finishHealthchecks());
  res = reducer(res, acknowledgeProblems());
  expect(res.healthcheckReport.categories[0].status).toEqual(
    'FAILED_ACKNOWLEDGED',
  );
  expect(res.healthcheckReport.categories[0].checks[0].status).toEqual(
    'FAILED_ACKNOWLEDGED',
  );
  expect(res.healthcheckReport.categories[1].status).toEqual('SUCCESS');
  expect(res.healthcheckReport.categories[2].status).toEqual(
    'FAILED_ACKNOWLEDGED',
  );
});
