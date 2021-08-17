/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {fireEvent, render} from '@testing-library/react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import {LaunchEmulatorDialog} from '../LaunchEmulator';

import {createRootReducer} from '../../../reducers';
import {sleep} from 'flipper-plugin';

import {launchEmulator} from '../../../server/devices/android/AndroidDevice';
jest.mock('../../../server/devices/android/AndroidDevice', () => ({
  launchEmulator: jest.fn(() => Promise.resolve([])),
}));

test('Can render and launch android apps - empty', async () => {
  const store = createStore(createRootReducer());
  const onClose = jest.fn();

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog
        onClose={onClose}
        getSimulators={() => Promise.resolve([])}
        getEmulators={() => Promise.resolve([])}
      />
    </Provider>,
  );

  expect(await renderer.findByText(/No emulators/)).toMatchInlineSnapshot(`
    <div
      class="ant-alert-message"
    >
      No emulators available
    </div>
  `);
});

test('Can render and launch android apps', async () => {
  const store = createStore(createRootReducer());
  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {
      ...store.getState().settingsState,
      enableAndroid: true,
    },
  });
  const onClose = jest.fn();

  let p: Promise<any> | undefined = undefined;

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog
        onClose={onClose}
        getSimulators={() => Promise.resolve([])}
        getEmulators={() => (p = Promise.resolve(['emulator1', 'emulator2']))}
      />
    </Provider>,
  );

  await p!;

  expect(await renderer.findAllByText(/emulator/)).toMatchInlineSnapshot(`
    Array [
      <span>
        emulator1
      </span>,
      <span>
        emulator2
      </span>,
    ]
  `);

  expect(onClose).not.toBeCalled();
  fireEvent.click(renderer.getByText('emulator2'));
  await sleep(1000);
  expect(onClose).toBeCalled();
  expect(launchEmulator).toBeCalledWith('emulator2', false);
});
