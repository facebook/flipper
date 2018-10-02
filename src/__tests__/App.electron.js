/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import React from 'react';
import {App} from '../App.js';
import {Provider} from 'react-redux';
import renderer from 'react-test-renderer';
import reducers from '../reducers/index.js';
import configureStore from 'redux-mock-store';
import Logger from '../fb-stubs/Logger.js';
import BugReporter from '../fb-stubs/BugReporter.js';

// create redux store with initial state
const mockStore = configureStore([])(reducers(undefined, {type: 'INIT'}));

test('Empty app state matches snapshot', () => {
  const logger = new Logger();
  const bugReporter = new BugReporter(logger);

  const component = renderer.create(
    <Provider store={mockStore}>
      <App
        logger={logger}
        bugReporter={bugReporter}
        leftSidebarVisible={false}
        bugDialogVisible={false}
        pluginManagerVisible={false}
        selectedDevice={null}
        toggleBugDialogVisible={() => {}}
        error={null}
      />
    </Provider>,
  );
  expect(component.toJSON()).toMatchSnapshot();
});
