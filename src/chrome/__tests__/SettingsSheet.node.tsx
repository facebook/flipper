/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import SettingsSheet from '../SettingsSheet';
import React from 'react';
import renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';

function getStore({
  iosEnabled,
  androidEnabled,
  androidHome,
}: {
  iosEnabled?: boolean;
  androidEnabled?: boolean;
  androidHome?: string;
}) {
  return configureStore([])({
    application: {
      sessionId: 'mysession',
      xcodeCommandLineToolsDetected: iosEnabled,
    },
    settingsState: {
      enableAndroid: androidEnabled,
      androidHome: androidHome,
    },
  });
}

test('SettingsSheet snapshot with nothing enabled', () => {
  const component = (
    <Provider store={getStore({})}>
      <SettingsSheet onHide={() => {}} />
    </Provider>
  );

  expect(renderer.create(component).toJSON()).toMatchSnapshot();
});

test('SettingsSheet snapshot with iOS enabled', () => {
  const component = (
    <Provider store={getStore({iosEnabled: true})}>
      <SettingsSheet onHide={() => {}} />
    </Provider>
  );

  expect(renderer.create(component).toJSON()).toMatchSnapshot();
});

test('SettingsSheet snapshot with android enabled', () => {
  const component = (
    <Provider store={getStore({androidEnabled: true})}>
      <SettingsSheet onHide={() => {}} />
    </Provider>
  );

  expect(renderer.create(component).toJSON()).toMatchSnapshot();
});

test('SettingsSheet snapshot with android home set', () => {
  const component = (
    <Provider store={getStore({androidHome: '/my/sdk/location'})}>
      <SettingsSheet onHide={() => {}} />
    </Provider>
  );

  expect(renderer.create(component).toJSON()).toMatchSnapshot();
});
