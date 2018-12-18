/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {createTablePlugin} from '../createTablePlugin.js';
import {FlipperPlugin} from '../plugin.js';

const PROPS = {
  method: 'method',
  resetMethod: 'resetMethod',
  columns: {},
  columnSizes: {},
  renderSidebar: () => {},
  buildRow: () => {},
};

test('createTablePlugin returns FlipperPlugin', () => {
  const tablePlugin = createTablePlugin({...PROPS});
  expect(tablePlugin.prototype).toBeInstanceOf(FlipperPlugin);
});

test('persistedStateReducer is resetting data', () => {
  const resetMethod = 'resetMethod';
  const tablePlugin = createTablePlugin({...PROPS, resetMethod});

  // $FlowFixMe persistedStateReducer exists for createTablePlugin
  const {rows, datas} = tablePlugin.persistedStateReducer(
    {
      datas: {'1': {id: '1'}},
      rows: [
        {
          key: '1',
          columns: {
            id: {
              value: '1',
            },
          },
        },
      ],
    },
    resetMethod,
    {},
  );

  expect(datas).toEqual({});
  expect(rows).toEqual([]);
});

test('persistedStateReducer is adding data', () => {
  const method = 'method';
  const tablePlugin = createTablePlugin({...PROPS, method});
  const id = '1';

  // $FlowFixMe persistedStateReducer exists for createTablePlugin
  const {rows, datas} = tablePlugin.persistedStateReducer(
    {
      datas: {},
      rows: [],
    },
    method,
    {id},
  );

  expect(rows.length).toBe(1);
  expect(Object.keys(datas)).toEqual([id]);
});
