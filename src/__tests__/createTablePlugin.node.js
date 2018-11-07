/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {createTablePlugin} from '../createTablePlugin.js';
import {FlipperPlugin} from '../plugin.js';

const PROPS = {
  title: 'Plugin Title',
  id: 'pluginID',
  icon: 'icon',
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

test('Plugin ID is set', () => {
  const id = 'pluginID';
  const tablePlugin = createTablePlugin({...PROPS, id});
  expect(tablePlugin.id).toBe(id);
});

test('Plugin title is set', () => {
  const title = 'My Plugin Title';
  const tablePlugin = createTablePlugin({...PROPS, title});
  expect(tablePlugin.title).toBe(title);
});

test('Plugin icon is set', () => {
  const icon = 'icon';
  const tablePlugin = createTablePlugin({...PROPS, icon});
  expect(tablePlugin.icon).toBe(icon);
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
