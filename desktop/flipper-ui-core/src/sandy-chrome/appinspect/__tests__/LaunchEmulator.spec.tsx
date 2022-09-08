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
import {getRenderHostInstance} from 'flipper-frontend-core';

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
  getRenderHostInstance().flipperServer.exec = async function (cmd: any) {
    return responses[cmd];
  } as any;
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
      No emulators available. 
      <br />
      <a
        class="ant-typography"
        href="http://fbflipper.com/docs/getting-started/troubleshooting/general/#i-see-no-emulators-available"
      >
        Learn more
      </a>
    </div>
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
  getRenderHostInstance().flipperServer.exec = async function (cmd: any) {
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
      id="rcDialogTitle1"
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

  getRenderHostInstance().flipperServer.exec = exec;

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
  expect(exec.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "android-get-emulators",
      ],
      Array [
        "android-launch-emulator",
        "emulator2",
        false,
      ],
    ]
  `);
});
