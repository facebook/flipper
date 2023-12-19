/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import {last} from 'lodash';
import {getFlipperServer} from '../../../flipperServer';

test('Can render and launch android apps - no emulators', async () => {
  const store = createStore(createRootReducer());
  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {
      ...store.getState().settingsState,
      enableAndroid: true,
      enableIOS: true,
    },
  });

  const responses: any = {
    'ios-get-simulators': [],
    'android-get-emulators': [],
  };
  getFlipperServer().exec = async function (cmd: any) {
    return responses[cmd];
  } as any;
  const onClose = jest.fn();

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog onClose={onClose} />
    </Provider>,
  );

  expect(await renderer.findAllByText(/Loading/)).toMatchInlineSnapshot(`
    [
      <div
        class="ant-typography"
        style="text-align: center;"
      >
        No emulators found
      </div>,
      <div
        class="ant-typography"
        style="text-align: center;"
      >
        No simulators found
      </div>,
    ]
  `);
});

test('Can render and launch android apps - no SDKs', async () => {
  const store = createStore(createRootReducer());
  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {
      ...store.getState().settingsState,
      enableAndroid: false,
      enableIOS: false,
    },
  });

  const responses: any = {
    'ios-get-simulators': [],
    'android-get-emulators': [],
  };
  getFlipperServer().exec = async function (cmd: any) {
    return responses[cmd];
  } as any;
  const onClose = jest.fn();

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog onClose={onClose} />
    </Provider>,
  );

  expect(await renderer.findByText(/No Mobile SDKs Enabled/))
    .toMatchInlineSnapshot(`
    <div
      class="ant-modal-title"
      id="test-id"
    >
      No Mobile SDKs Enabled
    </div>
  `);
});

test('Can render and launch android apps', async () => {
  const store = createStore(createRootReducer());

  const exec = jest.fn().mockImplementation(async (cmd) => {
    if (cmd === 'android-get-emulators') {
      return ['emulator1', 'emulator2'];
    }
  });

  getFlipperServer().exec = exec;

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

  await sleep(1); // give exec time to resolve

  expect(await renderer.findAllByText(/emulator/)).toMatchInlineSnapshot(`
    [
      <h3
        class="ant-typography"
        style="padding: 4px;"
      >
        Android emulators
      </h3>,
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
  expect(exec.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "android-get-emulators",
      ],
      [
        "android-launch-emulator",
        "emulator2",
        false,
      ],
    ]
  `);
});

test('Favouriting a virtual device brings it to the top', async () => {
  const store = createStore(createRootReducer());

  const exec = jest.fn().mockImplementation(async (cmd) => {
    if (cmd === 'android-get-emulators') {
      return ['emulator1', 'emulator2'];
    }
  });

  getFlipperServer().exec = exec;

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

  await sleep(1); // give exec time to resolve

  expect(await renderer.findAllByText(/emulator/)).toMatchInlineSnapshot(`
    [
      <h3
        class="ant-typography"
        style="padding: 4px;"
      >
        Android emulators
      </h3>,
      <span>
        emulator1
      </span>,
      <span>
        emulator2
      </span>,
    ]
  `);

  const lastFavourite = last(renderer.getAllByLabelText('not-favorite'))!;
  fireEvent.click(lastFavourite);

  expect(await renderer.findAllByText(/emulator/)).toMatchInlineSnapshot(`
    [
      <h3
        class="ant-typography"
        style="padding: 4px;"
      >
        Android emulators
      </h3>,
      <span>
        emulator2
      </span>,
      <span>
        emulator1
      </span>,
    ]
  `);
});
