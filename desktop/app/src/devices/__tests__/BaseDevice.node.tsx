/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from '../BaseDevice';
import * as DeviceTestPluginModule from '../../test-utils/DeviceTestPlugin';
import {TestUtils, _SandyPluginDefinition} from 'flipper-plugin';
import ArchivedDevice from '../ArchivedDevice';

const physicalDevicePluginDetails = TestUtils.createMockPluginDetails({
  id: 'physicalDevicePlugin',
  name: 'flipper-plugin-physical-device',
  version: '0.0.1',
  pluginType: 'device',
  supportedDevices: [
    {
      os: 'iOS',
      type: 'physical',
      archived: false,
    },
    {
      os: 'Android',
      type: 'physical',
    },
  ],
});
const physicalDevicePlugin = new _SandyPluginDefinition(
  physicalDevicePluginDetails,
  DeviceTestPluginModule,
);

const iosPhysicalDevicePluginDetails = TestUtils.createMockPluginDetails({
  id: 'iosPhysicalDevicePlugin',
  name: 'flipper-plugin-ios-physical-device',
  version: '0.0.1',
  pluginType: 'device',
  supportedDevices: [
    {
      os: 'iOS',
      type: 'physical',
    },
  ],
});
const iosPhysicalDevicePlugin = new _SandyPluginDefinition(
  iosPhysicalDevicePluginDetails,
  DeviceTestPluginModule,
);

const iosEmulatorlDevicePluginDetails = TestUtils.createMockPluginDetails({
  id: 'iosEmulatorDevicePlugin',
  name: 'flipper-plugin-ios-emulator-device',
  version: '0.0.1',
  pluginType: 'device',
  supportedDevices: [
    {
      os: 'iOS',
      type: 'emulator',
    },
  ],
});
const iosEmulatorDevicePlugin = new _SandyPluginDefinition(
  iosEmulatorlDevicePluginDetails,
  DeviceTestPluginModule,
);
const androiKaiosPhysicalDevicePluginDetails = TestUtils.createMockPluginDetails(
  {
    id: 'androidPhysicalDevicePlugin',
    name: 'flipper-plugin-android-physical-device',
    version: '0.0.1',
    pluginType: 'device',
    supportedDevices: [
      {
        os: 'Android',
        type: 'physical',
        specs: ['KaiOS'],
      },
    ],
  },
);
const androidKaiosPhysicalDevicePlugin = new _SandyPluginDefinition(
  androiKaiosPhysicalDevicePluginDetails,
  DeviceTestPluginModule,
);

const androidEmulatorlDevicePluginDetails = TestUtils.createMockPluginDetails({
  id: 'androidEmulatorDevicePlugin',
  name: 'flipper-plugin-android-emulator-device',
  version: '0.0.1',
  pluginType: 'device',
  supportedDevices: [
    {
      os: 'Android',
      type: 'emulator',
    },
  ],
});
const androidEmulatorDevicePlugin = new _SandyPluginDefinition(
  androidEmulatorlDevicePluginDetails,
  DeviceTestPluginModule,
);
test('ios physical device compatibility', () => {
  const device = new BaseDevice('serial', 'physical', 'test device', 'iOS');
  expect(device.supportsPlugin(physicalDevicePlugin)).toBeTruthy();
  expect(device.supportsPlugin(iosPhysicalDevicePlugin)).toBeTruthy();
  expect(device.supportsPlugin(iosEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidKaiosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidEmulatorDevicePlugin)).toBeFalsy();
});

test('archived device compatibility', () => {
  const device = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'physical',
    title: 'test device',
    os: 'iOS',
    screenshotHandle: null,
  });
  expect(device.supportsPlugin(physicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosPhysicalDevicePlugin)).toBeTruthy();
  expect(device.supportsPlugin(iosEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidKaiosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidEmulatorDevicePlugin)).toBeFalsy();
});

test('android emulator device compatibility', () => {
  const device = new BaseDevice('serial', 'emulator', 'test device', 'Android');
  expect(device.supportsPlugin(physicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidKaiosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidEmulatorDevicePlugin)).toBeTruthy();
});

test('android KaiOS device compatibility', () => {
  const device = new BaseDevice(
    'serial',
    'physical',
    'test device',
    'Android',
    ['KaiOS'],
  );
  expect(device.supportsPlugin(physicalDevicePlugin)).toBeTruthy();
  expect(device.supportsPlugin(iosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidKaiosPhysicalDevicePlugin)).toBeTruthy();
  expect(device.supportsPlugin(androidEmulatorDevicePlugin)).toBeFalsy();
});
