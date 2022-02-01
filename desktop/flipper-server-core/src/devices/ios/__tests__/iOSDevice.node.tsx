/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {checkXcodeVersionMismatch} from '../iOSDeviceManager';
import {getLogger} from 'flipper-common';
import {IOSBridge} from '../IOSBridge';
import {FlipperServerImpl} from '../../../FlipperServerImpl';
// eslint-disable-next-line node/no-extraneous-import
import {getRenderHostInstance} from 'flipper-ui-core';
import {
  getFlipperServerConfig,
  setFlipperServerConfig,
} from '../../../FlipperServerConfig';

let fakeSimctlBridge: any;
let hasCalledSimctlActiveDevices = false;

beforeEach(() => {
  hasCalledSimctlActiveDevices = false;
  fakeSimctlBridge = {
    getActiveDevices: async (_bootedOnly: boolean) => {
      hasCalledSimctlActiveDevices = true;
      return [];
    },
  };
  setFlipperServerConfig(getRenderHostInstance().serverConfig);
});

afterEach(() => {
  setFlipperServerConfig(undefined);
});

test('test checkXcodeVersionMismatch with correct Simulator.app', () => {
  const invalidVersion = checkXcodeVersionMismatch(
    [
      '/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/Contents/MacOS/Simulator',
    ],
    '/Applications/Xcode.app/Contents/Developer',
  );
  expect(invalidVersion).toEqual(undefined);
});

test('test checkXcodeVersionMismatch with an incorrect Simulator.app', () => {
  const invalidVersion = checkXcodeVersionMismatch(
    [
      '/Applications/Xcode_Incorrect.app/Contents/Developer/Applications/Simulator.app/Contents/MacOS/Simulator',
    ],
    '/Applications/Xcode.app/Contents/Developer',
  );
  expect(invalidVersion).toEqual(
    '/Applications/Xcode_Incorrect.app/Contents/Developer',
  );
});

test('test getAllPromisesForQueryingDevices when xcode detected', () => {
  const flipperServer = new FlipperServerImpl(
    getFlipperServerConfig(),
    getLogger(),
  );
  flipperServer.ios.iosBridge = {} as IOSBridge;
  (flipperServer.ios as any).idbConfig = getFlipperServerConfig().settings;
  flipperServer.ios.simctlBridge = fakeSimctlBridge;
  flipperServer.ios.getPromiseForQueryingDevices(false);
  expect(hasCalledSimctlActiveDevices).toEqual(true);
});

test('test getAllPromisesForQueryingDevices when idb is available', () => {
  const flipperServer = new FlipperServerImpl(
    getFlipperServerConfig(),
    getLogger(),
  );
  flipperServer.ios.iosBridge = {} as IOSBridge;
  (flipperServer.ios as any).idbConfig = getFlipperServerConfig().settings;
  flipperServer.ios.simctlBridge = fakeSimctlBridge;
  flipperServer.ios.getPromiseForQueryingDevices(true);
  expect(hasCalledSimctlActiveDevices).toEqual(false);
});
