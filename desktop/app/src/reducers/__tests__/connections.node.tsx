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

test('REGISTER_DEVICE doesnt remove error', () => {
  const initialState: State = reducer(undefined, {
    type: 'SERVER_ERROR',
    payload: {message: 'something went wrong'},
  });

  // Precondition
  expect(initialState.errors).toEqual([
    {message: 'something went wrong', occurrences: 1},
  ]);

  const endState = reducer(initialState, {
    type: 'REGISTER_DEVICE',
    payload: new BaseDevice('serial', 'physical', 'title', 'Android'),
  });

  expect(endState.errors).toEqual([
    {message: 'something went wrong', occurrences: 1},
  ]);
});

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

  const archived = device1.archive();
  state = reducer(state, {
    type: 'UNREGISTER_DEVICES',
    payload: new Set([device1.serial]),
  });
  expect(state.devices.length).toBe(0);

  state = reducer(state, {
    type: 'REGISTER_DEVICE',
    payload: archived,
  });
  expect(state.devices.length).toBe(1);
  expect(state.devices[0].displayTitle()).toBe('React Native (Offline)');

  state = reducer(state, {
    type: 'REGISTER_DEVICE',
    payload: new MetroDevice('http://localhost:8081', undefined),
  });
  expect(state.devices.length).toBe(1);
  expect(state.devices[0].displayTitle()).toBe('React Native');
});

test('triggering REGISTER_DEVICE before REGISTER_PLUGINS still registers device plugins', () => {
  class TestDevicePlugin extends FlipperDevicePlugin<any, any, any> {
    static id = 'test';
    static supportsDevice() {
      return true;
    }
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

test('errors are collected on a by name basis', () => {
  const initialState: State = reducer(undefined, {
    type: 'SERVER_ERROR',
    payload: {
      message: 'error1',
      error: 'stack1',
    },
  });

  expect(initialState.errors).toMatchInlineSnapshot(`
        Array [
          Object {
            "error": "stack1",
            "message": "error1",
            "occurrences": 1,
          },
        ]
    `);

  const state2: State = reducer(initialState, {
    type: 'SERVER_ERROR',
    payload: {
      message: 'error2',
      error: 'stack2',
    },
  });
  // There are now two errors
  expect(state2.errors).toMatchInlineSnapshot(`
        Array [
          Object {
            "error": "stack1",
            "message": "error1",
            "occurrences": 1,
          },
          Object {
            "error": "stack2",
            "message": "error2",
            "occurrences": 1,
          },
        ]
    `);
  const state3: State = reducer(state2, {
    type: 'SERVER_ERROR',
    payload: {
      message: 'error1',
      error: 'stack3',
    },
  });
  // Still two errors, but error1 has been updated and occurrences increased
  expect(state3.errors).toMatchInlineSnapshot(`
    Array [
      Object {
        "error": "stack3",
        "message": "error1",
        "occurrences": 2,
      },
      Object {
        "error": "stack2",
        "message": "error2",
        "occurrences": 1,
      },
    ]
  `);
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
