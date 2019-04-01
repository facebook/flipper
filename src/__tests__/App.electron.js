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
import {init as initLogger} from '../fb-stubs/Logger';
import BugReporter from '../fb-stubs/BugReporter.js';

// create redux store with initial state
const mockStore = configureStore([])(reducers(undefined, {type: 'INIT'}));

test('Empty app state matches snapshot', () => {
  const logger = initLogger(mockStore);
  const bugReporter = new BugReporter(logger, mockStore);

  const component = renderer.create(
    <Provider store={mockStore}>
      <App
        logger={logger}
        bugReporter={bugReporter}
        leftSidebarVisible={false}
        selectedDevice={null}
        error={null}
        activeSheet={null}
        exportFile={null}
      />
    </Provider>,
  );
  expect(component.toJSON()).toMatchSnapshot();
});
