/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createTablePlugin} from '../createTablePlugin';
import {FlipperPlugin} from '../plugin';
import {List, Map as ImmutableMap} from 'immutable';
import {TableRows_immutable} from '../ui/components/table/types';

const PROPS = {
  method: 'method',
  resetMethod: 'resetMethod',
  columns: {},
  columnSizes: {},
  renderSidebar: () => {},
  buildRow: () => {},
};

type PersistedState<T> = {
  rows: TableRows_immutable;
  datas: ImmutableMap<string, T>;
};

type RowData = {
  id: string;
};

test('createTablePlugin returns FlipperPlugin', () => {
  const tablePlugin = createTablePlugin({...PROPS});
  expect(tablePlugin.prototype).toBeInstanceOf(FlipperPlugin);
});

test('persistedStateReducer is resetting data', () => {
  const resetMethod = 'resetMethod';
  const tablePlugin = createTablePlugin<RowData>({...PROPS, resetMethod});

  const ps: PersistedState<RowData> = {
    datas: ImmutableMap({'1': {id: '1'}}),
    rows: List([
      {
        key: '1',
        columns: {
          id: {
            value: '1',
          },
        },
      },
    ]),
  };

  const {rows, datas} = tablePlugin.persistedStateReducer(ps, resetMethod, {
    id: '0',
  });

  expect(datas!.toJSON()).toEqual({});
  expect(rows!.size).toBe(0);
});

test('persistedStateReducer is adding data', () => {
  const method = 'method';
  const tablePlugin = createTablePlugin({...PROPS, method});
  const id = '1';

  const {rows, datas} = tablePlugin.persistedStateReducer(
    tablePlugin.defaultPersistedState,
    method,
    {id},
  );

  expect(rows!.size).toBe(1);
  expect([...datas!.keys()]).toEqual([id]);
});
