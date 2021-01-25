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

import {rootReducer} from '../../../store';
import {act} from 'react-dom/test-utils';
import {sleep} from '../../../utils';

jest.mock('../../../devices/AndroidDevice', () => ({
  launchEmulator: jest.fn(() => Promise.resolve([])),
}));

import {launchEmulator} from '../../../devices/AndroidDevice';

test('Can render and launch android apps', async () => {
  const store = createStore(rootReducer);
  const onClose = jest.fn();

  const renderer = render(
    <Provider store={store}>
      <LaunchEmulatorDialog
        onClose={onClose}
        getSimulators={() => Promise.resolve([])}
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

  act(() => {
    store.dispatch({
      type: 'REGISTER_ANDROID_EMULATORS',
      payload: ['emulator1', 'emulator2'],
    });
  });

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
