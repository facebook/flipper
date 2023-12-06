/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as PluginInstaller} from '../PluginInstaller';
import React from 'react';
import {render, waitFor} from '@testing-library/react';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import type {PluginDetails, UpdatablePluginDetails} from 'flipper-common';
import {Store} from '../../../reducers';
import {getFlipperServer} from '../../../flipperServer';

let getUpdatablePluginsMock: jest.Mock<any, any>;

beforeEach(() => {
  // flipperServer get resets before each test, no need to do so explicitly
  getUpdatablePluginsMock = getFlipperServer().exec = jest.fn();
});

function getStore(installedPlugins: PluginDetails[] = []): Store {
  return configureStore([])({
    application: {sessionId: 'mysession'},
    plugins: {installedPlugins},
  }) as Store;
}

const samplePluginDetails1: UpdatablePluginDetails = {
  name: 'flipper-plugin-hello',
  entry: './test/index.js',
  version: '0.1.0',
  specVersion: 2,
  pluginType: 'client',
  main: 'dist/bundle.js',
  dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample1',
  source: 'src/index.js',
  id: 'Hello',
  title: 'Hello',
  description: 'World?',
  isActivatable: true,
  updateStatus: {
    kind: 'not-installed',
    version: '0.1.0',
  },
};

const samplePluginDetails2: UpdatablePluginDetails = {
  name: 'flipper-plugin-world',
  entry: './test/index.js',
  version: '0.2.0',
  specVersion: 2,
  pluginType: 'client',
  main: 'dist/bundle.js',
  dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample2',
  source: 'src/index.js',
  id: 'World',
  title: 'World',
  description: 'Hello?',
  isActivatable: true,
  updateStatus: {
    kind: 'not-installed',
    version: '0.2.0',
  },
};

const SEARCH_RESULTS = [samplePluginDetails1, samplePluginDetails2];

test('load PluginInstaller list', async () => {
  getUpdatablePluginsMock.mockReturnValue(Promise.resolve(SEARCH_RESULTS));
  const component = (
    <Provider store={getStore()}>
      <PluginInstaller
        // Bit ugly to have this as an effectively test-only option, but
        // without, we rely on height information which we don't
        // have, causing no items to be rendered.
        autoHeight
      />
    </Provider>
  );
  const {container, getByText} = render(component);
  await waitFor(() => getByText('hello'));
  expect(getUpdatablePluginsMock.mock.calls.length).toBe(1);
  expect(container).toMatchSnapshot();
});

test('load PluginInstaller list with one plugin installed', async () => {
  getUpdatablePluginsMock.mockReturnValue(
    Promise.resolve([
      {...samplePluginDetails1, updateStatus: {kind: 'up-to-date'}},
      samplePluginDetails2,
    ]),
  );
  const store = getStore([samplePluginDetails1]);
  const component = (
    <Provider store={store}>
      <PluginInstaller
        // Bit ugly to have this as an effectively test-only option, but
        // without, we rely on height information which we don't
        // have, causing no items to be rendered.
        autoHeight
      />
    </Provider>
  );
  const {container, getByText} = render(component);
  await waitFor(() => getByText('hello'));
  expect(getUpdatablePluginsMock.mock.calls.length).toBe(1);
  expect(container).toMatchSnapshot();
});
