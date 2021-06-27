/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  parseXcodeFromCoreSimPath,
  getAllPromisesForQueryingDevices,
} from '../iOSDevice';
import configureStore from 'redux-mock-store';
import {State, createRootReducer} from '../../reducers/index';
import {getInstance} from '../../fb-stubs/Logger';

const mockStore = configureStore<State, {}>([])(
  createRootReducer()(undefined, {type: 'INIT'}),
);
const logger = getInstance();

const standardCoresimulatorLog =
  'username            1264   0.0  0.1  5989740  41648   ??  Ss    2:23PM   0:12.92 /Applications/Xcode_12.4.0_fb.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS.simruntime/Contents/Resources/RuntimeRoot/usr/libexec/mobileassetd';

const nonStandardCoresimulatorLog =
  'username            1264   0.0  0.1  5989740  41648   ??  Ss    2:23PM   0:12.92 /Some/Random/Path/Xcode_12.4.0_fb.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS.simruntime/Contents/Resources/RuntimeRoot/usr/libexec/mobileassetd';

const nonStandardSpecialCharacterAphanumericCoresimulatorLog =
  'username            1264   0.0  0.1  5989740  41648   ??  Ss    2:23PM   0:12.92 /Some_R@d0m/Path-3455355/path(2)+connection/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS.simruntime/Contents/Resources/RuntimeRoot/usr/libexec/mobileassetd';

test('test parseXcodeFromCoreSimPath from non standard locations', () => {
  const match = parseXcodeFromCoreSimPath(nonStandardCoresimulatorLog);
  expect(match && match.length > 0).toBeTruthy();
  expect(
    // @ts-ignore the null and non zero lenght check for match is already done above
    match[0],
  ).toEqual('/Some/Random/Path/Xcode_12.4.0_fb.app/Contents/Developer');
});

test('test parseXcodeFromCoreSimPath from non standard alphanumeric special character locations', () => {
  const match = parseXcodeFromCoreSimPath(
    nonStandardSpecialCharacterAphanumericCoresimulatorLog,
  );
  expect(match && match.length > 0).toBeTruthy();
  expect(
    // @ts-ignore the null and non zero lenght check for match is already done above
    match[0],
  ).toEqual(
    '/Some_R@d0m/Path-3455355/path(2)+connection/Xcode.app/Contents/Developer',
  );
});

test('test parseXcodeFromCoreSimPath from standard locations', () => {
  const match = parseXcodeFromCoreSimPath(standardCoresimulatorLog);
  expect(match && match.length > 0).toBeTruthy();
  expect(
    // @ts-ignore the null and non zero lenght check for match is already done above
    match[0],
  ).toEqual('/Applications/Xcode_12.4.0_fb.app/Contents/Developer');
});

test('test getAllPromisesForQueryingDevices when xcode detected', () => {
  const promises = getAllPromisesForQueryingDevices(
    mockStore,
    logger,
    {
      idbAvailable: false,
    },
    true,
  );
  expect(promises.length).toEqual(3);
});

test('test getAllPromisesForQueryingDevices when xcode is not detected', () => {
  const promises = getAllPromisesForQueryingDevices(
    mockStore,
    logger,
    {
      idbAvailable: true,
    },
    false,
  );
  expect(promises.length).toEqual(1);
});
