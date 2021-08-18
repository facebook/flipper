/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {render, fireEvent} from '@testing-library/react';
import React from 'react';
import {TroubleshootingGuide} from '../fb/TroubleshootingGuide';
import {Provider} from 'react-redux';
import {createMockFlipperWithPlugin} from '../../../test-utils/createMockFlipperWithPlugin';
import {TestUtils} from 'flipper-plugin';
import {loadNext} from '../fb/TroubleshootingGuide';

test('render initial screen of troubleshooting guide correctly', async () => {
  const TestPlugin = TestUtils.createTestPlugin({
    plugin() {
      return {};
    },
  });

  const {store} = await createMockFlipperWithPlugin(TestPlugin);

  const res = render(
    <Provider store={store}>
      <TroubleshootingGuide showGuide />,
    </Provider>,
  );

  // Clicking on the troubleshooting guide button to launch the guide
  fireEvent.click(res.getByText('Troubleshooting Guide'));

  // Checking if the 3 initial questions appear
  expect(res.queryAllByText("Can't see the device.").length).toBe(1);
  expect(res.queryAllByText('Can see the device but not the app.').length).toBe(
    1,
  );
  expect(
    res.queryAllByText('Can see the device and the app but not the plugin.')
      .length,
  ).toBe(1);

  // Clicking on close
  fireEvent.click(res.getByRole('button', {name: 'Close'}));

  // Checking if close on the modal popup works and the questions are no longer visible
  expect(res.queryAllByText("Can't see the device.").length).toBe(0);
  expect(res.queryAllByText('Can see the device but not the app.').length).toBe(
    0,
  );
  expect(
    res.queryAllByText('Can see the device and the app but not the plugin.')
      .length,
  ).toBe(0);

  // Clicking on the first radio checkbox ie the first question after re-launching the guide
  fireEvent.click(res.getByText('Troubleshooting Guide'));
  fireEvent.click(res.getByText("Can't see the device."));
  fireEvent.click(res.getByText('Next'));

  // Checking if the screen of the first question shows up
  expect(res.queryAllByText('Work in progress Q1 !').length).toBe(1);
});

test('check return value of loadNext function', async () => {
  const toggleModal = jest.fn();
  const result = loadNext('cannot_see_device', toggleModal);
  // Checking loadNext returns 'q1' which will be used to toggleModal when the user input in the previous screen was 'opt1'
  expect(result).toBe('question1');
});
