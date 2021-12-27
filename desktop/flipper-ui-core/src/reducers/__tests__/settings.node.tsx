/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as reducer, updateSettings} from '../settings';
import {Tristate} from 'flipper-common';

test('updateSettings', () => {
  const initialSettings = reducer(undefined, {type: 'INIT'});
  const updatedSettings = Object.assign(initialSettings, {
    enableAndroid: false,
    enablePrefetching: Tristate.True,
  });
  const res = reducer(initialSettings, updateSettings(updatedSettings));

  expect(res.enableAndroid).toBeFalsy();
  expect(res.enablePrefetching).toEqual(Tristate.True);
});
