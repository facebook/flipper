/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as BaseDevice} from '../devices/BaseDevice';
import {createMockFlipperWithPlugin} from '../test-utils/createMockFlipperWithPlugin';
import {
  TestUtils,
  _SandyPluginDefinition,
  createState,
  DevicePluginClient,
} from 'flipper-plugin';

test('Devices can disconnect', async () => {
  const deviceplugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      devicePlugin(client: DevicePluginClient) {
        const destroy = jest.fn();
        client.onDestroy(destroy);
        const counter = createState(0);
        return {
          counter,
          destroy,
        };
      },
      supportsDevice() {
        return true;
      },
      Component() {
        return null;
      },
    },
  );
  const {device} = await createMockFlipperWithPlugin(deviceplugin);

  device.sandyPluginStates.get(deviceplugin.id)!.instanceApi.counter.set(1);

  expect(device.isArchived).toBe(false);

  device.markDisconnected();

  expect(device.isArchived).toBe(true);
  const instance = device.sandyPluginStates.get(deviceplugin.id)!;
  expect(instance).toBeTruthy();
  expect(instance.instanceApi.counter.get(1)).toBe(1); // state preserved
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);

  device.destroy();
  expect(device.isArchived).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(1);

  expect(device.sandyPluginStates.get(deviceplugin.id)).toBeUndefined();
});

test('New device with same serial removes & cleans the old one', async () => {
  const deviceplugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      devicePlugin(client: DevicePluginClient) {
        const destroy = jest.fn();
        client.onDestroy(destroy);
        return {
          destroy,
        };
      },
      supportsDevice() {
        return true;
      },
      Component() {
        return null;
      },
    },
  );
  const {device, store} = await createMockFlipperWithPlugin(deviceplugin);

  const instance = device.sandyPluginStates.get(deviceplugin.id)!;

  expect(device.isArchived).toBe(false);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices).toEqual([device]);

  // submit a new device with same serial
  const device2 = new BaseDevice(
    device.serial,
    'physical',
    'MockAndroidDevice',
    'Android',
  );
  store.dispatch({
    type: 'REGISTER_DEVICE',
    payload: device2,
  });
  device2.loadDevicePlugins(store.getState().plugins.devicePlugins);

  expect(device.isArchived).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(1);
  expect(
    device2.sandyPluginStates.get(deviceplugin.id)!.instanceApi.destroy,
  ).toBeCalledTimes(0);
  expect(store.getState().connections.devices.length).toBe(1);
  expect(store.getState().connections.devices[0]).toBe(device2);
});
