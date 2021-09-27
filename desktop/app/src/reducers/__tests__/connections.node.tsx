/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import reducer from '../connections';
import {State, selectPlugin} from '../connections';
import {
  _SandyPluginDefinition,
  _setFlipperLibImplementation,
  TestUtils,
  MockedConsole,
} from 'flipper-plugin';
import {TestDevice} from '../../test-utils/TestDevice';
import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';

let mockedConsole: MockedConsole;
beforeEach(() => {
  mockedConsole = TestUtils.mockConsole();
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

test('register, remove, re-register a metro device works correctly', () => {
  const device1 = new TestDevice(
    'http://localhost:8081',
    'emulator',
    'React Native',
    'Metro',
  );
  let state: State = reducer(undefined, {
    type: 'REGISTER_DEVICE',
    payload: device1,
  });
  expect(state.devices.length).toBe(1);
  expect(state.devices[0].displayTitle()).toBe('React Native');

  device1.disconnect();

  expect(state.devices.length).toBe(1);
  expect(state.devices[0].displayTitle()).toBe('React Native (Offline)');

  state = reducer(state, {
    type: 'REGISTER_DEVICE',
    payload: new TestDevice(
      'http://localhost:8081',
      'emulator',
      'React Native',
      'Metro',
    ),
  });
  expect(state.devices.length).toBe(1);
  expect(state.devices[0].displayTitle()).toBe('React Native');
  expect(state.devices[0]).not.toBe(device1);
});

test('selectPlugin sets deepLinkPayload correctly', () => {
  const state = reducer(
    undefined,
    selectPlugin({selectedPlugin: 'myPlugin', deepLinkPayload: 'myPayload'}),
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

  expect(store.getState().connections.clients.length).toBe(1);
  expect(client.connected.get()).toBe(true);

  expect((console.error as any).mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "Failed to start plugin 'TestPlugin': ",
      [Error: Broken plugin],
    ]
  `);

  const device2 = await createDevice({});
  const client2 = await createClient(device2, client.query.app);

  expect((console.error as any).mock.calls[1]).toMatchInlineSnapshot(`
    Array [
      "Failed to start plugin 'TestPlugin': ",
      [Error: Broken plugin],
    ]
  `);
  expect(store.getState().connections.clients.length).toBe(2);
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

  const {device, store, createDevice} = await createMockFlipperWithPlugin(
    TestPlugin,
  );

  expect(mockedConsole.errorCalls[0]).toMatchInlineSnapshot(`
    Array [
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
    Array [
      "Failed to start device plugin 'TestPlugin': ",
      [Error: Broken device plugin],
    ]
  `);
  expect(device2.sandyPluginStates.size).toBe(0);
});
