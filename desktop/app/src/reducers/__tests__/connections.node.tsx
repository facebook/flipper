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
import BaseDevice from '../../devices/BaseDevice';
import MacDevice from '../../devices/MacDevice';
import {FlipperDevicePlugin} from '../../plugin';
import MetroDevice from '../../devices/MetroDevice';
import {TestUtils} from 'flipper-plugin';

test('doing a double REGISTER_DEVICE keeps the last', () => {
  const device1 = new BaseDevice('serial', 'physical', 'title', 'Android');
  const device2 = new BaseDevice('serial', 'physical', 'title2', 'Android');
  const initialState: State = reducer(undefined, {
    type: 'REGISTER_DEVICE',
    payload: device1,
  });
  expect(initialState.devices.length).toBe(1);
  expect(initialState.devices[0]).toBe(device1);

  const endState = reducer(initialState, {
    type: 'REGISTER_DEVICE',
    payload: device2,
  });
  expect(endState.devices.length).toBe(1);
  expect(endState.devices[0]).toBe(device2);
});

test('register, remove, re-register a metro device works correctly', () => {
  const device1 = new MetroDevice('http://localhost:8081', undefined);
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
    payload: new MetroDevice('http://localhost:8081', undefined),
  });
  expect(state.devices.length).toBe(1);
  expect(state.devices[0].displayTitle()).toBe('React Native');
  expect(state.devices[0]).not.toBe(device1);
});

test('triggering REGISTER_DEVICE before REGISTER_PLUGINS still registers device plugins', () => {
  class TestDevicePlugin extends FlipperDevicePlugin<any, any, any> {
    static id = 'test';
    static supportsDevice() {
      return true;
    }
    static details = TestUtils.createMockPluginDetails({
      id: 'test',
      pluginType: 'device',
    });
  }

  const stateWithDevice = reducer(undefined, {
    type: 'REGISTER_DEVICE',
    payload: new MacDevice(),
  });

  const endState = reducer(stateWithDevice, {
    type: 'REGISTER_PLUGINS',
    payload: [TestDevicePlugin],
  });

  expect(endState.devices[0].devicePlugins).toEqual(['test']);
});

test('selectPlugin sets deepLinkPayload correctly', () => {
  const state = reducer(
    undefined,
    selectPlugin({selectedPlugin: 'myPlugin', deepLinkPayload: 'myPayload'}),
  );
  expect(state.deepLinkPayload).toBe('myPayload');
});

test('UNREGISTER_DEVICE removes device', () => {
  const device = new BaseDevice('serial', 'physical', 'title', 'Android');
  const initialState: State = reducer(undefined, {
    type: 'REGISTER_DEVICE',
    payload: new BaseDevice('serial', 'physical', 'title', 'Android'),
  });

  expect(initialState.devices).toEqual([device]);
  const endState = reducer(initialState, {
    type: 'UNREGISTER_DEVICES',
    payload: new Set(['serial']),
  });

  expect(endState.devices).toEqual([]);
});
