/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ShareSheetPendingDialog from '../ShareSheetPendingDialog';
import React from 'react';
import renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([])({application: {sessionId: 'mysession'}});
import {Provider} from 'react-redux';

test('ShareSheetPendingDialog is rendered with status update', () => {
  const component = (
    <Provider store={mockStore}>
      <ShareSheetPendingDialog
        onCancel={() => {}}
        onRunInBackground={() => {}}
        statusMessage="wubba lubba dub dub"
        statusUpdate="Update"
      />
    </Provider>
  );

  expect(renderer.create(component).toJSON()).toMatchSnapshot();
});

test('ShareSheetPendingDialog is rendered without status update', () => {
  const component = (
    <Provider store={mockStore}>
      <ShareSheetPendingDialog
        onCancel={() => {}}
        onRunInBackground={() => {}}
        statusMessage="wubba lubba dub dub"
        statusUpdate={null}
      />
    </Provider>
  );

  expect(renderer.create(component).toJSON()).toMatchSnapshot();
});
