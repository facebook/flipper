/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {default as PluginInstaller, PluginDefinition} from '../PluginInstaller';

import React from 'react';
import {render, waitForElement} from '@testing-library/react';
import {init as initLogger} from '../../fb-stubs/Logger';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([])({application: {sessionId: 'mysession'}});
import {Provider} from 'react-redux';

const SEARCH_RESULTS = ({
  hits: [
    {name: 'flipper-plugin-hello', version: '0.1.0', description: 'World?'},
    {name: 'flipper-plugin-world', version: '0.2.0', description: 'Hello?'},
  ],
} as unknown) as algoliasearch.Response<any>;

// *Very* incomplete mock, but that's all we use.
const indexMock: algoliasearch.Index = ({
  search: jest.fn(),
} as unknown) as algoliasearch.Index;

beforeEach(() => {
  indexMock.search = jest.fn(async () => SEARCH_RESULTS);
  initLogger(mockStore as any, {isTest: true});
});

test('load PluginInstaller list', async () => {
  const component = (
    <Provider store={mockStore}>
      <PluginInstaller
        getInstalledPlugins={async () => new Map<string, PluginDefinition>()}
        searchIndexFactory={() => indexMock}
        // Bit ugly to have this as an effectively test-only option, but
        // without, we rely on height information from Electron which we don't
        // have, causing no items to be rendered.
        autoHeight={true}
      />
    </Provider>
  );
  const {container, getByText} = render(component);
  await waitForElement(() => getByText('flipper-plugin-hello'));
  expect((indexMock.search as jest.Mock).mock.calls.length).toBe(2);
  expect(container).toMatchSnapshot();
});
