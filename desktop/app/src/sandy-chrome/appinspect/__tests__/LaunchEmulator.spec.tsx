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
import {createFlipperServerMock} from '../../../test-utils/createFlipperServerMock';

test('Can render and launch android apps - empty', async () => {
  const store = createStore(createRootReducer());
  const mockServer = createFlipperServerMock({
    'ios-get-simulators': () => Promise.resolve([]),
    'android-get-emulators': () => Promise.resolve([]),
  });
  store.dispatch({
    type: 'SET_FLIPPER_SERVER',
    payload: mockServer,
  });
  const onClose = jest.fn();

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog onClose={onClose} />
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
  let p: Promise<any> | undefined = undefined;

  const store = createStore(createRootReducer());
  const launch = jest.fn().mockImplementation(() => Promise.resolve());
  const mockServer = createFlipperServerMock({
    'ios-get-simulators': () => Promise.resolve([]),
    'android-get-emulators': () =>
      (p = Promise.resolve(['emulator1', 'emulator2'])),
    'android-launch-emulator': launch,
  });
  store.dispatch({
    type: 'SET_FLIPPER_SERVER',
    payload: mockServer,
  });

  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {
      ...store.getState().settingsState,
      enableAndroid: true,
    },
  });
  const onClose = jest.fn();

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog onClose={onClose} />
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
  expect(launch).toBeCalledWith('emulator2', false);
});
