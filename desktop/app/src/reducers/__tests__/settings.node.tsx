/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, updateSettings, Tristate} from '../settings';

test('init', () => {
  const res = reducer(undefined, {type: 'INIT'});
  expect(res.enableAndroid).toBeTruthy();
});

test('updateSettings', () => {
  const initialSettings = reducer(undefined, {type: 'INIT'});
  const updatedSettings = Object.assign(initialSettings, {
    enableAndroid: false,
    enablePrefetching: Tristate.True,
    jsApps: {
      webAppLauncher: {
        height: 900,
      },
    },
  });
  const res = reducer(initialSettings, updateSettings(updatedSettings));

  expect(res.enableAndroid).toBeFalsy();
  expect(res.enablePrefetching).toEqual(Tristate.True);
  expect(res.jsApps.webAppLauncher.height).toEqual(900);
  expect(res.jsApps.webAppLauncher.width).toEqual(
    initialSettings.jsApps.webAppLauncher.width,
  );
});
