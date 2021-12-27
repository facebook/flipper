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
import {getRenderHostInstance} from '../../../RenderHost';

test('Can render and launch android apps - empty', async () => {
  const store = createStore(createRootReducer());

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
      No emulators available
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
