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
  PluginClient,
} from 'flipper-plugin';
import {registerNewClient} from '../dispatcher/server';
import {destroyDevice} from '../reducers/connections';

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
          get isConnected() {
            return client.device.isConnected;
          },
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
  expect(
    device.sandyPluginStates.get(deviceplugin.id)!.instanceApi.isConnected,
  ).toBe(true);

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(true);

  device.disconnect();

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(false);
  const instance = device.sandyPluginStates.get(deviceplugin.id)!;
  expect(instance.instanceApi.isConnected).toBe(false);
  expect(instance).toBeTruthy();
  expect(instance.instanceApi.counter.get()).toBe(1); // state preserved
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);

  device.destroy();
  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(false);
  expect(instance.instanceApi.destroy).toBeCalledTimes(1);

  expect(device.sandyPluginStates.get(deviceplugin.id)).toBeUndefined();
});

test('New device with same serial removes & cleans the old one', async () => {
  const deviceplugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({pluginType: 'device'}),
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
  const {device, store, logger} = await createMockFlipperWithPlugin(
    deviceplugin,
  );

  const instance = device.sandyPluginStates.get(deviceplugin.id)!;

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices).toEqual([device]);

  // calling destroy explicitly defeats the point of this test a bit,
  // but we now print an error rather than proactively destroying the device,
  // see https://github.com/facebook/flipper/issues/1989
  destroyDevice(store, logger, device.serial);
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
  device2.loadDevicePlugins(
    store.getState().plugins.devicePlugins,
    store.getState().connections.enabledDevicePlugins,
  );

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(false);
  expect(instance.instanceApi.destroy).toBeCalledTimes(1);
  expect(
    device2.sandyPluginStates.get(deviceplugin.id)!.instanceApi.destroy,
  ).toBeCalledTimes(0);
  expect(store.getState().connections.devices.length).toBe(1);
  expect(store.getState().connections.devices[0]).toBe(device2);
});

test('clients can disconnect but preserve state', async () => {
  const plugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin(client: PluginClient) {
        const connect = jest.fn();
        const disconnect = jest.fn();
        const destroy = jest.fn();
        client.onConnect(connect);
        client.onDestroy(destroy);
        client.onDisconnect(disconnect);
        const counter = createState(0);
        return {
          connect,
          disconnect,
          counter,
          destroy,
          get isConnected() {
            return client.isConnected;
          },
        };
      },
      Component() {
        return null;
      },
    },
  );
  const {client} = await createMockFlipperWithPlugin(plugin, {
    asBackgroundPlugin: true,
  });

  let instance = client.sandyPluginStates.get(plugin.id)!;
  instance.instanceApi.counter.set(1);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(instance.instanceApi.connect).toBeCalledTimes(1);
  expect(instance.instanceApi.disconnect).toBeCalledTimes(0);
  expect(instance.instanceApi.isConnected).toBe(true);
  expect(client.connected.get()).toBe(true);

  client.disconnect();

  expect(client.connected.get()).toBe(false);
  instance = client.sandyPluginStates.get(plugin.id)!;
  expect(instance).toBeTruthy();
  expect(instance.instanceApi.counter.get()).toBe(1); // state preserved
  expect(instance.instanceApi.isConnected).toBe(false);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(instance.instanceApi.connect).toBeCalledTimes(1);
  expect(instance.instanceApi.disconnect).toBeCalledTimes(1);

  client.destroy();
  expect(instance.instanceApi.destroy).toBeCalledTimes(1);
  expect(instance.instanceApi.connect).toBeCalledTimes(1);
  expect(instance.instanceApi.disconnect).toBeCalledTimes(1);

  expect(client.sandyPluginStates.get(plugin.id)).toBeUndefined();
});

test('new clients replace old ones', async () => {
  const plugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin(client: PluginClient) {
        const connect = jest.fn();
        const disconnect = jest.fn();
        const destroy = jest.fn();
        client.onConnect(connect);
        client.onDestroy(destroy);
        client.onDisconnect(disconnect);
        const counter = createState(0);
        return {
          connect,
          disconnect,
          counter,
          destroy,
        };
      },
      Component() {
        return null;
      },
    },
  );
  const {client, store, device, createClient} =
    await createMockFlipperWithPlugin(plugin, {
      asBackgroundPlugin: true,
    });

  const instance = client.sandyPluginStates.get(plugin.id)!;
  instance.instanceApi.counter.set(1);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(instance.instanceApi.connect).toBeCalledTimes(1);
  expect(instance.instanceApi.disconnect).toBeCalledTimes(0);

  const client2 = await createClient(device, 'AnotherApp', client.query, true);
  registerNewClient(store, client2);

  expect(client2.connected.get()).toBe(true);
  const instance2 = client2.sandyPluginStates.get(plugin.id)!;
  expect(instance2).toBeTruthy();
  expect(instance2.instanceApi.counter.get()).toBe(0);
  expect(instance2.instanceApi.destroy).toBeCalledTimes(0);
  expect(instance2.instanceApi.connect).toBeCalledTimes(1);
  expect(instance2.instanceApi.disconnect).toBeCalledTimes(0);

  expect(client.connected.get()).toBe(false);
  expect(instance.instanceApi.counter.get()).toBe(1);
  expect(instance.instanceApi.destroy).toBeCalledTimes(1);
  expect(instance.instanceApi.connect).toBeCalledTimes(1);
  expect(instance.instanceApi.disconnect).toBeCalledTimes(1);
});
