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
import {Healthchecks, EnvironmentInfo} from 'flipper-doctor';

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
          return {hasProblem: false, message: ''};
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
          return {hasProblem: true, message: 'Error'};
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
          return {hasProblem: false, message: ''};
        },
      },
    ],
  },
};

test('startHealthCheck', () => {
  const res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  expect(res).toMatchSnapshot();
});

test('updateHealthcheckResult', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult('android', 'android.sdk', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  expect(res).toMatchSnapshot();
});

test('finish', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult('ios', 'ios.sdk', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('android', 'android.sdk', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('common', 'common.openssl', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(res, finishHealthchecks());
  expect(res).toMatchSnapshot();
});

test('statuses updated after healthchecks finished', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult('android', 'android.sdk', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'FAILED',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('ios', 'ios.sdk', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('common', 'common.openssl', {
      message: 'Updated Test Message',
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(res, finishHealthchecks());
  expect(res).toMatchSnapshot();
});

test('acknowledgeProblems', () => {
  let res = reducer(undefined, startHealthchecks(HEALTHCHECKS));
  res = reducer(
    res,
    updateHealthcheckResult('ios', 'ios.sdk', {
      isAcknowledged: false,
      status: 'FAILED',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('android', 'android.sdk', {
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('common', 'common.openssl', {
      isAcknowledged: false,
      status: 'FAILED',
    }),
  );
  res = reducer(res, finishHealthchecks());
  res = reducer(res, acknowledgeProblems());
  expect(res).toMatchSnapshot();
});
