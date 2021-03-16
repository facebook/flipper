/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createDataSource} from '../DataSource';

type Todo = {
  id: string;
  title: string;
  done?: boolean;
};

const drinkCoffee: Todo = {
  id: 'coffee',
  title: 'drink coffee',
};
const eatCookie: Todo = {
  id: 'cookie',
  title: 'eat a cookie',
  done: true,
};
const submitBug: Todo = {
  id: 'bug',
  title: 'submit a bug',
  done: false,
};

test('can create a datasource', () => {
  const ds = createDataSource<Todo>([eatCookie]);
  expect(ds.records).toEqual([eatCookie]);

  ds.append(drinkCoffee);
  expect(ds.records).toEqual([eatCookie, drinkCoffee]);

  expect(() => ds.recordsById).toThrow(/Records cannot be looked up by key/);

  ds.update(1, submitBug);
  expect(ds.records[1]).toBe(submitBug);
});

test('can create a keyed datasource', () => {
  const ds = createDataSource<Todo>([eatCookie], 'id');
  expect(ds.records).toEqual([eatCookie]);

  ds.append(drinkCoffee);
  expect(ds.records).toEqual([eatCookie, drinkCoffee]);

  expect(ds.recordsById.get('bug')).toBe(undefined);
  expect(ds.recordsById.get('cookie')).toBe(eatCookie);
  expect(ds.recordsById.get('coffee')).toBe(drinkCoffee);
  expect(ds.indexOfKey('bug')).toBe(-1);
  expect(ds.indexOfKey('cookie')).toBe(0);
  expect(ds.indexOfKey('coffee')).toBe(1);

  ds.update(1, submitBug);
  expect(ds.records[1]).toBe(submitBug);
  expect(ds.recordsById.get('coffee')).toBe(undefined);
  expect(ds.recordsById.get('bug')).toBe(submitBug);
  expect(ds.indexOfKey('bug')).toBe(1);
  expect(ds.indexOfKey('cookie')).toBe(0);
  expect(ds.indexOfKey('coffee')).toBe(-1);

  // upsert existing
  const newBug = {
    id: 'bug',
    title: 'file a bug',
    done: true,
  };
  ds.upsert(newBug);
  expect(ds.records[1]).toBe(newBug);
  expect(ds.recordsById.get('bug')).toBe(newBug);

  // upsert new
  const trash = {
    id: 'trash',
    title: 'take trash out',
  };
  ds.upsert(trash);
  expect(ds.records[2]).toBe(trash);
  expect(ds.recordsById.get('trash')).toBe(trash);
});

test('throws on invalid keys', () => {
  const ds = createDataSource<Todo>([eatCookie], 'id');
  expect(() => {
    ds.append({id: '', title: 'test'});
  }).toThrow(`Invalid key value: ''`);
  expect(() => {
    ds.append({id: 'cookie', title: 'test'});
  }).toThrow(`Duplicate key: 'cookie'`);
});
