/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import Client from '../../Client';
import {create, act, ReactTestRenderer} from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import {default as BaseDevice} from '../../devices/BaseDevice';
import ExportDataPluginSheet from '../ExportDataPluginSheet';
import {FlipperPlugin, FlipperDevicePlugin} from '../../plugin';

function generateClientIdentifier(device: BaseDevice, app: string): string {
  const {os, deviceType, serial} = device;
  const identifier = `${app}#${os}#${deviceType}#${serial}`;
  return identifier;
}

class TestPlugin extends FlipperPlugin<any, any, any> {}
TestPlugin.title = 'TestPlugin';
TestPlugin.id = 'TestPlugin';
TestPlugin.defaultPersistedState = {msg: 'Test plugin'};
class TestDevicePlugin extends FlipperDevicePlugin<any, any, any> {}
TestDevicePlugin.title = 'TestDevicePlugin';
TestDevicePlugin.id = 'TestDevicePlugin';
TestDevicePlugin.defaultPersistedState = {msg: 'TestDevicePlugin'};

function getStore(selectedPlugins: Array<string>) {
  const logger = {
    track: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trackTimeSince: () => {},
  };
  const selectedDevice = new BaseDevice(
    'serial',
    'emulator',
    'TestiPhone',
    'iOS',
  );

  const clientId = generateClientIdentifier(selectedDevice, 'app');
  const pluginStates: {[key: string]: any} = {};
  pluginStates[`${clientId}#TestDevicePlugin`] = {
    msg: 'Test Device plugin',
  };
  pluginStates[`${clientId}#TestPlugin`] = {
    msg: 'Test plugin',
  };
  const mockStore = configureStore([])({
    application: {share: {closeOnFinish: false, type: 'link'}},
    plugins: {
      clientPlugins: new Map([['TestPlugin', TestPlugin]]),
      devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
      gatekeepedPlugins: [],
      disabledPlugins: [],
      failedPlugins: [],
      selectedPlugins,
    },
    pluginStates,
    pluginMessageQueue: [],
    connections: {selectedApp: clientId, clients: []},
  });

  const client = new Client(
    clientId,
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial',
    },
    null,
    logger,
    // @ts-ignore
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    selectedDevice,
  );
  mockStore.dispatch({
    type: 'NEW_CLIENT',
    payload: client,
  });

  return mockStore;
}

test('SettingsSheet snapshot with nothing enabled', async () => {
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(
      <Provider store={getStore([])}>
        <ExportDataPluginSheet onHide={() => {}} />
      </Provider>,
    );
  });

  expect(root!.toJSON()).toMatchSnapshot();
});

test('SettingsSheet snapshot with one plugin enabled', async () => {
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(
      <Provider store={getStore(['TestPlugin'])}>
        <ExportDataPluginSheet onHide={() => {}} />
      </Provider>,
    );
  });

  expect(root!.toJSON()).toMatchSnapshot();
});
