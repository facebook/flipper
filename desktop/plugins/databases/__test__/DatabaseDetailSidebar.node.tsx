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
// TODO T71355623
// eslint-disable-next-line flipper/no-relative-imports-across-packages
import reducers, {Store} from '../../../app/src/reducers';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';

import {Value} from 'flipper';
import DatabaseDetailSidebar from '../DatabaseDetailSidebar';

const labels: Array<string> = [
  '_id',
  'db1_col0_text',
  'db1_col1_integer',
  'db1_col2_float',
  'db1_col3_blob',
  'db1_col4_null',
  'db1_col5',
  'db1_col6',
  'db1_col7',
  'db1_col8',
  'db1_col9',
];
const values: Array<Value> = [
  {value: 1, type: 'integer'},
  {value: 'Long text data for testing resizing', type: 'string'},
  {value: 1000, type: 'integer'},
  {value: 1000.4650268554688, type: 'float'},
  {value: '\u0000\u0000\u0000\u0001\u0001\u0000\u0001\u0001', type: 'blob'},
  {value: null, type: 'null'},
  {value: 'db_1_column5_value', type: 'string'},
  {value: 'db_1_column6_value', type: 'string'},
  {value: 'db_1_column7_value', type: 'string'},
  {value: 'db_1_column8_value', type: 'string'},
  {value: 'db_1_column9_value', type: 'string'},
];

const mockStore: Store = configureStore([])(
  reducers(undefined, {type: 'INIT'}),
) as Store;

beforeEach(() => {
  mockStore.dispatch({type: 'rightSidebarAvailable', value: true});
  mockStore.dispatch({type: 'rightSidebarVisible', value: true});
});

test('render and try to see if it renders properly', () => {
  const res = render(
    <Provider store={mockStore}>
      <div id="detailsSidebar">
        <DatabaseDetailSidebar columnLabels={labels} columnValues={values} />
      </div>
    </Provider>,
  );

  for (const label of labels) {
    expect(res.queryAllByText(label).length).toBeGreaterThan(0);
  }
  for (const value of values) {
    if (value.type === 'blob') {
      continue;
    }
    const searchValue: string =
      value.type === 'null' ? 'NULL' : value.value.toString();
    expect(res.queryAllByText(searchValue).length).toBeGreaterThan(0);
  }
  // Edit, Save, Close buttons should not be shown because no onSave is provided
  expect(res.queryAllByText('Edit').length).toBe(0);
  expect(res.queryAllByText('Save').length).toBe(0);
  expect(res.queryAllByText('Close').length).toBe(0);
});

test('render edit, save, and close correctly when onSave provided', () => {
  const res = render(
    <Provider store={mockStore}>
      <div id="detailsSidebar">
        <DatabaseDetailSidebar
          columnLabels={labels}
          columnValues={values}
          onSave={() => {}}
        />
      </div>
    </Provider>,
  );

  // expect only Edit to show up
  expect(res.queryAllByText('Edit').length).toBe(1);
  expect(res.queryAllByText('Save').length).toBe(0);
  expect(res.queryAllByText('Close').length).toBe(0);

  fireEvent.click(res.getByText('Edit'));
  // expect Save and Close to show up
  expect(res.queryAllByText('Edit').length).toBe(0);
  expect(res.queryAllByText('Save').length).toBe(1);
  expect(res.queryAllByText('Close').length).toBe(1);

  // unclickable because none field has changed
  fireEvent.click(res.getByText('Save'));
  expect(res.queryAllByText('Edit').length).toBe(0);
  expect(res.queryAllByText('Save').length).toBe(1);
  expect(res.queryAllByText('Close').length).toBe(1);

  // Click on close to return to the previous state
  fireEvent.click(res.getByText('Close'));
  expect(res.queryAllByText('Edit').length).toBe(1);
  expect(res.queryAllByText('Save').length).toBe(0);
  expect(res.queryAllByText('Close').length).toBe(0);
});

test('editing some field after trigger Edit', async () => {
  const mockOnSave = jest.fn((_changes) => {});
  const res = render(
    <Provider store={mockStore}>
      <div id="detailsSidebar">
        <DatabaseDetailSidebar
          columnLabels={labels}
          columnValues={values}
          onSave={mockOnSave}
        />
      </div>
    </Provider>,
  );

  fireEvent.click(res.getByText('Edit'));
  // still find all values because it needs to show up
  for (const value of values) {
    const searchValue = value.value?.toString();
    expect(
      (value.type === 'null'
        ? res.queryAllByPlaceholderText('NULL')
        : value.type === 'blob'
        ? res.queryAllByText(searchValue!)
        : res.queryAllByDisplayValue(searchValue!)
      ).length,
    ).toBeGreaterThan(0);
  }

  // expect the last one to contain value of 'db_1_column9_value'
  const textFields = await res.findAllByTestId('update-query-input');
  const lastTextField = textFields[textFields.length - 1];
  // add '_edited' to the back
  fireEvent.change(lastTextField, {
    target: {value: 'db_1_column9_value_edited'},
  });

  // be able to click on Save
  fireEvent.click(res.getByText('Save'));
  expect(res.queryAllByText('Edit').length).toBe(1);
  expect(res.queryAllByText('Save').length).toBe(0);
  expect(res.queryAllByText('Close').length).toBe(0);

  expect(mockOnSave.mock.calls.length).toBe(1);
  expect(mockOnSave.mock.calls[0][0]).toEqual({
    db1_col9: 'db_1_column9_value_edited',
  });
});
