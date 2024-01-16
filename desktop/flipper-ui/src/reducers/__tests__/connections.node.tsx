/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import reducer, {selectClient, selectDevice} from '../connections';
import {State, selectPlugin} from '../connections';
import {
  _SandyPluginDefinition,
  _setFlipperLibImplementation,
  TestUtils,
} from 'flipper-plugin';
import {
  createMockFlipperWithPlugin,
  MockFlipperResult,
} from '../../__tests__/test-utils/createMockFlipperWithPlugin';
import {Store} from '..';
import {getActiveClient, getActiveDevice} from '../../selectors/connections';
import Client from '../../Client';
import {
  mockConsole,
  MockedConsole,
} from '../../__tests__/test-utils/mockConsole';
import {TestDevice} from '../../devices/TestDevice';
import BaseDevice from '../../devices/BaseDevice';

let mockedConsole: MockedConsole;
beforeEach(() => {
  mockedConsole = mockConsole();
  _setFlipperLibImplementation(TestUtils.createMockFlipperLib());
});

afterEach(() => {
  mockedConsole.unmock();
  _setFlipperLibImplementation(undefined);
});

test('doing a double REGISTER_DEVICE fails', () => {
  const device1 = new TestDevice('serial', 'physical', 'title', 'Android');
  const device2 = new TestDevice('serial', 'physical', 'title2', 'Android');
  const initialState: State = reducer(undefined, {
    type: 'REGISTER_DEVICE',
    payload: device1,
  });
  expect(initialState.devices.length).toBe(1);
  expect(initialState.devices[0]).toBe(device1);

  expect(() => {
    reducer(initialState, {
      type: 'REGISTER_DEVICE',
      payload: device2,
    });
  }).toThrow('still connected');
});

test('selectPlugin sets deepLinkPayload correctly', () => {
  const device1 = new TestDevice(
    'http://localhost:8081',
    'emulator',
    'React Native',
    'Metro',
  );
  let state = reducer(undefined, {
    type: 'REGISTER_DEVICE',
    payload: device1,
  });
  state = reducer(
    undefined,
    selectPlugin({
      selectedPlugin: 'myPlugin',
      deepLinkPayload: 'myPayload',
      selectedDevice: device1,
    }),
  );
  expect(state.deepLinkPayload).toBe('myPayload');
});

test('can handle plugins that throw at start', async () => {
  const TestPlugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      Component() {
        return null;
      },
      plugin() {
        throw new Error('Broken plugin');
      },
    },
  );

  const {client, store, createClient, createDevice} =
    await createMockFlipperWithPlugin(TestPlugin);

  // not initialized
  expect(client.sandyPluginStates.get(TestPlugin.id)).toBe(undefined);

  expect(store.getState().connections.clients.size).toBe(1);
  expect(client.connected.get()).toBe(true);

  expect((console.error as any).mock.calls[0]).toMatchInlineSnapshot(`
    [
      "Failed to start plugin 'TestPlugin': ",
      [Error: Broken plugin],
    ]
  `);

  const device2 = await createDevice({});
  const client2 = await createClient(device2, client.query.app);

  expect((console.error as any).mock.calls[1]).toMatchInlineSnapshot(`
    [
      "Failed to start plugin 'TestPlugin': ",
      [Error: Broken plugin],
    ]
  `);
  expect(store.getState().connections.clients.size).toBe(2);
  expect(client2.connected.get()).toBe(true);
  expect(client2.sandyPluginStates.size).toBe(0);
});

test('can handle device plugins that throw at start', async () => {
  const TestPlugin = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      Component() {
        return null;
      },
      devicePlugin() {
        throw new Error('Broken device plugin');
      },
    },
  );

  const {device, store, createDevice} =
    await createMockFlipperWithPlugin(TestPlugin);

  expect(mockedConsole.errorCalls[0]).toMatchInlineSnapshot(`
    [
      "Failed to start device plugin 'TestPlugin': ",
      [Error: Broken device plugin],
    ]
  `);

  // not initialized
  expect(device.sandyPluginStates.get(TestPlugin.id)).toBe(undefined);

  expect(store.getState().connections.devices.length).toBe(1);
  expect(device.connected.get()).toBe(true);

  const device2 = await createDevice({});
  expect(store.getState().connections.devices.length).toBe(2);
  expect(device2.connected.get()).toBe(true);
  expect(mockedConsole.errorCalls[1]).toMatchInlineSnapshot(`
    [
      "Failed to start device plugin 'TestPlugin': ",
      [Error: Broken device plugin],
    ]
  `);
  expect(device2.sandyPluginStates.size).toBe(0);
});

describe('selection changes', () => {
  const TestPlugin1 = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      Component() {
        return null;
      },
      plugin() {
        return {};
      },
    },
  );
  const TestPlugin2 = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      Component() {
        return null;
      },
      plugin() {
        return {};
      },
    },
  );
  const DevicePlugin1 = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails({pluginType: 'device'}),
    {
      Component() {
        return null;
      },
      devicePlugin() {
        return {};
      },
    },
  );

  let device1: BaseDevice;
  let device2: BaseDevice;
  let d1app1: Client;
  let d1app2: Client;
  let d2app2: Client;
  let store: Store;
  let mockFlipper: MockFlipperResult;

  beforeEach(async () => {
    mockFlipper = await createMockFlipperWithPlugin(TestPlugin1, {
      additionalPlugins: [TestPlugin2, DevicePlugin1],
      supportedPlugins: [TestPlugin1.id, TestPlugin2.id, DevicePlugin1.id],
    });

    device1 = mockFlipper.device;
    device2 = mockFlipper.createDevice({});
    d1app1 = mockFlipper.client;
    d1app2 = await mockFlipper.createClient(device1, 'd1app2');
    d2app2 = await mockFlipper.createClient(device2, 'd2app2');
    store = mockFlipper.store;
  });

  test('basic/ device selection change', async () => {
    // after registering d1app2, this will have become the selection
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device1,
      selectedPlugin: TestPlugin1.id,
      selectedAppId: d1app2.id,
      // no preferences changes, no explicit selection was made
      userPreferredDevice: device1.title,
      userPreferredPlugin: TestPlugin1.id,
      userPreferredApp: d1app1.query.app,
    });
    expect(getActiveClient(store.getState())).toBe(d1app2);
    expect(getActiveDevice(store.getState())).toBe(device1);

    // select plugin 2 on d2app2
    store.dispatch(
      selectPlugin({
        selectedPlugin: TestPlugin2.id,
        selectedAppId: d2app2.id,
      }),
    );
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device2,
      selectedPlugin: TestPlugin2.id,
      selectedAppId: d2app2.id,
      userPreferredDevice: device2.title,
      userPreferredPlugin: TestPlugin2.id,
      userPreferredApp: d2app2.query.app,
    });

    // disconnect device1, and then register a new device should select it
    device1.disconnect();
    const device3 = await mockFlipper.createDevice({});
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device3,
      selectedPlugin: TestPlugin2.id,
      selectedAppId: null,
      // prefs not updated
      userPreferredDevice: device2.title,
      userPreferredPlugin: TestPlugin2.id,
      userPreferredApp: d2app2.query.app,
    });

    store.dispatch(selectDevice(device1));
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device1,
      selectedPlugin: TestPlugin2.id,
      selectedAppId: null,
      userPreferredDevice: device1.title,
      // other prefs not updated
      userPreferredPlugin: TestPlugin2.id,
      userPreferredApp: d2app2.query.app,
    });

    // used by plugin list, to keep main device / app selection correct
    expect(getActiveClient(store.getState())).toBe(null);
    expect(getActiveDevice(store.getState())).toBe(device1);
  });

  test('introducing new client does not select it', async () => {
    await mockFlipper.createClient(device2, 'd2app3');
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device1,
      selectedPlugin: TestPlugin1.id,
      selectedAppId: d1app2.id,
      // other prefs not updated
      userPreferredDevice: device1.title,
      userPreferredPlugin: TestPlugin1.id,
      userPreferredApp: d1app1.query.app,
    });
  });

  test('introducing new client does select it if preferred', async () => {
    // pure testing evil
    const client3 = await mockFlipper.createClient(
      device2,
      store.getState().connections.userPreferredApp!,
    );
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device2,
      selectedPlugin: TestPlugin1.id,
      selectedAppId: client3.id,
      // other prefs not updated
      userPreferredDevice: device1.title,
      userPreferredPlugin: TestPlugin1.id,
      userPreferredApp: d1app1.query.app,
    });
  });

  test('introducing new client does select it if old is offline', async () => {
    d1app2.disconnect();
    const client3 = await mockFlipper.createClient(device2, 'd2app3');
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device2,
      selectedPlugin: TestPlugin1.id,
      selectedAppId: client3.id,
      // other prefs not updated
      userPreferredDevice: device1.title,
      userPreferredPlugin: TestPlugin1.id,
      userPreferredApp: d1app1.query.app,
    });
  });

  test('select client', () => {
    store.dispatch(selectClient(d2app2.id));
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device2,
      selectedPlugin: TestPlugin1.id,
      selectedAppId: d2app2.id,
      userPreferredDevice: device2.title,
      userPreferredPlugin: TestPlugin1.id,
      userPreferredApp: d2app2.query.app,
    });
  });

  test('select device', () => {
    store.dispatch(selectDevice(device1));
    expect(store.getState().connections).toMatchObject({
      selectedDevice: device1,
      selectedPlugin: TestPlugin1.id,
      selectedAppId: null,
      userPreferredDevice: device1.title,
      // other prefs not updated
      userPreferredPlugin: TestPlugin1.id,
      userPreferredApp: d1app1.query.app,
    });
  });
});
