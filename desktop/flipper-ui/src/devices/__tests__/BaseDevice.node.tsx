/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger} from 'flipper-common';
import Client from '../../Client';
import {
  TestUtils,
  _SandyPluginDefinition,
  _setFlipperLibImplementation,
} from 'flipper-plugin';
import {default as ArchivedDevice} from '../ArchivedDevice';
import {TestDevice} from '../TestDevice';
import {getFlipperServer} from '../../flipperServer';

const createDeviceTestPluginModule = () => ({
  devicePlugin: jest.fn(),
  Component: jest.fn(),
});

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
  createDeviceTestPluginModule(),
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
  createDeviceTestPluginModule(),
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
  createDeviceTestPluginModule(),
);
const androiKaiosPhysicalDevicePluginDetails =
  TestUtils.createMockPluginDetails({
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
  });
const androidKaiosPhysicalDevicePlugin = new _SandyPluginDefinition(
  androiKaiosPhysicalDevicePluginDetails,
  createDeviceTestPluginModule(),
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
  createDeviceTestPluginModule(),
);

const androidOnlyDevicePluginDetails = TestUtils.createMockPluginDetails({
  id: 'androidEmulatorDevicePlugin',
  name: 'flipper-plugin-android-emulator-device',
  version: '0.0.1',
  pluginType: 'device',
  supportedDevices: [
    {
      os: 'Android',
    },
  ],
});
const androidOnlyDevicePlugin = new _SandyPluginDefinition(
  androidOnlyDevicePluginDetails,
  createDeviceTestPluginModule(),
);

export class TestClient extends Client {
  private pluginDefinitions: _SandyPluginDefinition[];
  constructor(device: TestDevice, pluginDefinitions: _SandyPluginDefinition[]) {
    super(
      'testClient',
      {} as any,
      {
        send: jest.fn(),
        sendExpectResponse: jest.fn(),
      },
      getLogger(),
      {} as any,
      undefined,
      device,
      getFlipperServer(),
    );
    this.pluginDefinitions = pluginDefinitions;
  }

  shouldConnectAsBackgroundPlugin() {
    return false;
  }

  async getPlugin(pluginId: string) {
    return this.pluginDefinitions.find(({id}) => id === pluginId);
  }

  isEnabledPlugin() {
    return true;
  }

  async waitForPluginsInit() {}
}

test('ios physical device compatibility', () => {
  const device = new TestDevice('serial', 'physical', 'test device', 'iOS');
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
  const device = new TestDevice('serial', 'emulator', 'test device', 'Android');
  expect(device.supportsPlugin(physicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidKaiosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidEmulatorDevicePlugin)).toBeTruthy();
});

test('android KaiOS device compatibility', () => {
  const device = new TestDevice(
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

test('android dummy device compatibility', () => {
  const device = new TestDevice('serial', 'dummy', 'test device', 'Android');
  expect(device.supportsPlugin(physicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(iosEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidKaiosPhysicalDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidEmulatorDevicePlugin)).toBeFalsy();
  expect(device.supportsPlugin(androidOnlyDevicePlugin)).toBeTruthy();
});

test('log listeners are resumed and suspended automatically - 1', async () => {
  const message = {
    date: new Date(),
    message: 'test',
    pid: 0,
    tid: 1,
    type: 'info',
    tag: 'tag',
  } as const;
  const device = new TestDevice('serial', 'physical', 'test device', 'Android');
  device.startLogging = jest.fn();
  device.stopLogging = jest.fn();

  const DevicePlugin = TestUtils.createTestDevicePlugin({
    devicePlugin(client) {
      const entries: any[] = [];
      let disposer: any;

      function start() {
        disposer = client.onDeviceLogEntry((entry) => {
          entries.push(entry);
        });
      }
      function stop() {
        disposer?.();
      }

      start();

      return {start, stop, entries};
    },
  });

  _setFlipperLibImplementation(TestUtils.createMockFlipperLib());

  device.loadDevicePlugins(
    new Map([[DevicePlugin.id, DevicePlugin]]),
    new Set([DevicePlugin.id]),
  );
  const instance = device.sandyPluginStates.get(DevicePlugin.id);
  expect(instance).toBeDefined();
  const entries = instance?.instanceApi.entries as any[];

  // logging set up, messages arrive
  expect(device.startLogging).toBeCalledTimes(1);
  device.addLogEntry(message);
  expect(entries.length).toBe(1);

  // stop, messages don't arrive
  instance?.instanceApi.stop();
  expect(device.stopLogging).toBeCalledTimes(1);
  device.addLogEntry(message);
  expect(entries.length).toBe(1);

  // resume, messsages arrive again
  instance?.instanceApi.start();
  expect(device.startLogging).toBeCalledTimes(2);
  expect(device.stopLogging).toBeCalledTimes(1);
  device.addLogEntry(message);
  expect(entries.length).toBe(2);

  // device disconnects, loggers are disposed
  device.disconnect();
  expect(device.stopLogging).toBeCalledTimes(2);
});

test('log listeners are resumed and suspended automatically - 2', async () => {
  const message = {
    date: new Date(),
    message: 'test',
    pid: 0,
    tid: 1,
    type: 'info',
    tag: 'tag',
  } as const;
  const device = new TestDevice('serial', 'physical', 'test device', 'Android');
  device.startLogging = jest.fn();
  device.stopLogging = jest.fn();

  const entries: any[] = [];

  const DevicePlugin = TestUtils.createTestDevicePlugin({
    devicePlugin(client) {
      client.onDeviceLogEntry((entry) => {
        entries.push(entry);
      });
      return {};
    },
  });

  const Plugin = TestUtils.createTestPlugin(
    {
      plugin(client) {
        client.onDeviceLogEntry((entry) => {
          entries.push(entry);
        });
        return {};
      },
    },
    {
      id: 'AnotherPlugin',
    },
  );

  const client = new TestClient(device, [Plugin]);

  _setFlipperLibImplementation(TestUtils.createMockFlipperLib());

  device.loadDevicePlugins(
    new Map([[DevicePlugin.id, DevicePlugin]]),
    new Set([DevicePlugin.id]),
  );

  (client.connection?.sendExpectResponse as jest.Mock).mockImplementationOnce(
    () => ({
      success: {
        plugins: [Plugin.id],
      },
    }),
  );
  await client.init();
  const instance = device.sandyPluginStates.get(DevicePlugin.id);
  expect(instance).toBeDefined();

  // logging set up, messages arrives in both
  expect(device.startLogging).toBeCalledTimes(1);
  device.addLogEntry(message);
  expect(entries.length).toBe(2);

  // disable one plugin
  client.stopPluginIfNeeded(Plugin.id);
  expect(device.stopLogging).toBeCalledTimes(0);
  device.addLogEntry(message);
  expect(entries.length).toBe(3);

  // disable the other plugin
  device.unloadDevicePlugin(DevicePlugin.id);
  expect(device.stopLogging).toBeCalledTimes(1);
  device.addLogEntry(message);
  expect(entries.length).toBe(3);

  // re-enable plugn
  client.startPluginIfNeeded(Plugin);
  expect(device.startLogging).toBeCalledTimes(2);
  device.addLogEntry(message);
  expect(entries.length).toBe(4);
});
