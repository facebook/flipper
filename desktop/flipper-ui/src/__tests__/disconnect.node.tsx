/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createMockFlipperWithPlugin} from './test-utils/createMockFlipperWithPlugin';
import {
  TestUtils,
  _SandyPluginDefinition,
  createState,
  DevicePluginClient,
  PluginClient,
} from 'flipper-plugin';
import {
  handleClientConnected,
  handleDeviceConnected,
  handleDeviceDisconnected,
} from '../dispatcher/flipperServer';
import {TestDevice} from '../devices/TestDevice';

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
  const {device, store} = await createMockFlipperWithPlugin(deviceplugin);

  const instance = device.sandyPluginStates.get(deviceplugin.id)!;

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices).toEqual([device]);

  // submit a new device with same serial
  const device2 = new TestDevice(
    device.serial,
    'physical',
    'MockAndroidDevice',
    'Android',
  );
  expect(() => {
    store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: device2,
    });
  }).toThrow('still connected');
  device.destroy();
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

test('Persist data enabled reconnect same device does not wipe data', async () => {
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
  const {device, store, logger} =
    await createMockFlipperWithPlugin(deviceplugin);
  const server = TestUtils.createFlipperServerMock({
    'client-request-response': async () => ({
      success: [],
      length: 0,
    }),
  });
  const instance = device.sandyPluginStates.get(deviceplugin.id)!;

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices[0]).toEqual(device);
  expect(store.getState().settingsState.persistDeviceData).toBe(false);
  //Update the persist data setting
  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {...store.getState().settingsState, persistDeviceData: true},
  });
  expect(store.getState().settingsState.persistDeviceData).toBe(true);

  handleDeviceConnected(server, store, logger, device.description);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices.length).toBe(1);
  expect(store.getState().connections.devices[0].sandyPluginStates).toBe(
    device.sandyPluginStates,
  );
});

test('Persist data enabled multiple devices maintain same data', async () => {
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
  const {device, store, logger, server} =
    await createMockFlipperWithPlugin(deviceplugin);

  const instance = device.sandyPluginStates.get(deviceplugin.id)!;

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices[0]).toEqual(device);
  expect(store.getState().settingsState.persistDeviceData).toBe(false);

  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {...store.getState().settingsState, persistDeviceData: true},
  });

  expect(store.getState().settingsState.persistDeviceData).toBe(true);

  // Same device, data should be persisted
  handleDeviceConnected(server, store, logger, device.description);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices.length).toBe(1);
  expect(store.getState().connections.devices[0]).toBe(device);

  const device2 = new TestDevice(
    'test2',
    'physical',
    'MockAndroidDevice',
    'Android',
  );
  handleDeviceConnected(server, store, logger, device2.description);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices.length).toBe(2);
  expect(store.getState().connections.selectedDevice).not.toBe(device);
  expect(store.getState().connections.selectedDevice?.serial).toBe(
    device2.serial,
  );

  //Connect back the device1
  handleDeviceConnected(server, store, logger, device.description);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices.length).toBe(2);
  expect(store.getState().connections.selectedDevice).toBe(device);
});

test('Persist data enabled device is disconnected and reconnected properly', async () => {
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
  const {device, store, logger, server} =
    await createMockFlipperWithPlugin(deviceplugin);

  const instance = device.sandyPluginStates.get(deviceplugin.id)!;

  expect(device.isArchived).toBe(false);
  expect(device.connected.get()).toBe(true);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(store.getState().connections.devices[0]).toEqual(device);

  handleDeviceDisconnected(store, logger, device.description);
  expect(device.connected.get()).toBe(false);

  // We want to test with the same device
  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {...store.getState().settingsState, persistDeviceData: true},
  });

  handleDeviceConnected(server, store, logger, device.description);
  expect(device.connected.get()).toBe(true);
  expect(store.getState().connections.selectedDevice).toBe(device);
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
  const {client, store, device, createClient, logger} =
    await createMockFlipperWithPlugin(plugin, {
      asBackgroundPlugin: true,
    });

  const instance = client.sandyPluginStates.get(plugin.id)!;
  instance.instanceApi.counter.set(1);
  expect(instance.instanceApi.destroy).toBeCalledTimes(0);
  expect(instance.instanceApi.connect).toBeCalledTimes(1);
  expect(instance.instanceApi.disconnect).toBeCalledTimes(0);

  const client2 = await createClient(device, 'AnotherApp', client.query, true);
  await handleClientConnected(
    TestUtils.createFlipperServerMock({
      'client-request-response': async () => ({
        success: [],
        length: 0,
      }),
    }),
    store,
    logger,
    client2,
  );

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
