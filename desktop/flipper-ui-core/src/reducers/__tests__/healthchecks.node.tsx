/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import type {FlipperDoctor} from 'flipper-common';

const HEALTHCHECKS: FlipperDoctor.Healthchecks = {
  ios: {
    label: 'iOS',
    isSkipped: false,
    isRequired: true,
    healthchecks: [
      {
        key: 'ios.sdk',
        label: 'SDK Installed',
        run: async (_env: FlipperDoctor.EnvironmentInfo) => {
          return {
            hasProblem: false,
            message: ['ios.sdk--installed', {platforms: ['ios']}],
          };
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
        run: async (_env: FlipperDoctor.EnvironmentInfo) => {
          return {
            hasProblem: true,
            message: ['android.sdk--no_ANDROID_HOME'],
          };
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
        run: async (_env: FlipperDoctor.EnvironmentInfo) => {
          return {
            hasProblem: false,
            message: ['common.openssl--installed', {output: 'not found'}],
          };
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
      message: ['android.sdk--installed', {output: 'some error message'}],
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
      message: ['ios.sdk--installed', {platforms: ['ios']}],
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('android', 'android.sdk', {
      message: ['android.sdk--installed', {output: 'success'}],
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('common', 'common.openssl', {
      message: ['common.openssl--installed', {output: 'not found'}],
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
      message: ['android.sdk--not_installed', {output: 'some error message'}],
      isAcknowledged: false,
      status: 'FAILED',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('ios', 'ios.sdk', {
      message: ['ios.sdk--installed', {platforms: ['ios']}],
      isAcknowledged: false,
      status: 'SUCCESS',
    }),
  );
  res = reducer(
    res,
    updateHealthcheckResult('common', 'common.openssl', {
      message: ['common.openssl--installed', {output: 'found'}],
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
