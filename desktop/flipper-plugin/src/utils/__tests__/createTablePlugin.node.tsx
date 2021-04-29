/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createTablePlugin} from '../createTablePlugin';
import {startPlugin} from '../../test-utils/test-utils';

const PROPS = {
  method: 'method',
  resetMethod: 'resetMethod',
  columns: [],
  renderSidebar: (_row: RowData) => {},
};

type RowData = {
  id: string;
  value?: string;
};

test('createTablePlugin returns FlipperPlugin', () => {
  const tablePlugin = createTablePlugin(PROPS);
  const p = startPlugin(tablePlugin);
  expect(Object.keys(p.instance)).toMatchInlineSnapshot(`
    Array [
      "selection",
      "rows",
      "isPaused",
    ]
  `);
});

test('createTablePlugin can add and reset data', () => {
  const resetMethod = 'resetMethod';
  const tablePlugin = createTablePlugin({...PROPS, resetMethod});

  const initialSnapshot = [{id: '1'}];

  const p = startPlugin(tablePlugin, {initialState: {rows: initialSnapshot}});

  expect(p.instance.rows.records()).toEqual(initialSnapshot);

  p.sendEvent('method', {id: '2'});
  expect(p.instance.rows.records()).toEqual([{id: '1'}, {id: '2'}]);
  expect(p.exportState()).toEqual({rows: [{id: '1'}, {id: '2'}]});

  p.sendEvent('resetMethod', {});
  expect(p.instance.rows.records()).toEqual([]);
});

test('createTablePlugin can add and reset data', () => {
  const resetMethod = 'resetMethod';
  const tablePlugin = createTablePlugin({...PROPS, resetMethod});

  const initialSnapshot = [{id: '1'}];

  const p = startPlugin(tablePlugin, {initialState: {rows: initialSnapshot}});

  expect(p.instance.rows.records()).toEqual(initialSnapshot);

  p.sendEvent('method', {id: '2'});
  expect(p.instance.rows.records()).toEqual([{id: '1'}, {id: '2'}]);
  expect(p.exportState()).toEqual({rows: [{id: '1'}, {id: '2'}]});

  // without key, this will append
  p.sendEvent('method', {id: '1'});
  expect(p.instance.rows.records()).toEqual([{id: '1'}, {id: '2'}, {id: '1'}]);

  p.sendEvent('resetMethod', {});
  expect(p.instance.rows.records()).toEqual([]);
});

test('createTablePlugin can upsert data if key is set', () => {
  const tablePlugin = createTablePlugin({...PROPS, key: 'id'});

  const initialSnapshot = [{id: '1'}];

  const p = startPlugin(tablePlugin, {initialState: {rows: initialSnapshot}});

  expect(p.instance.rows.records()).toEqual(initialSnapshot);

  p.sendEvent('method', {id: '2'});
  expect(p.instance.rows.records()).toEqual([{id: '1'}, {id: '2'}]);
  expect(p.exportState()).toEqual({rows: [{id: '1'}, {id: '2'}]});

  // key set, so we can upsert
  p.sendEvent('method', {id: '1', value: 'hi'});
  expect(p.instance.rows.records()).toEqual([
    {id: '1', value: 'hi'},
    {id: '2'},
  ]);
});
