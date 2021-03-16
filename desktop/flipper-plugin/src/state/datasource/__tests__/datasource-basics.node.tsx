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

test('sorting works', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee]);
  ds.setSortBy((todo) => todo.title);
  expect(ds.sortedRecords).toEqual([drinkCoffee, eatCookie]);

  ds.setSortBy(undefined);
  ds.setSortBy(undefined);
  expect(ds.sortedRecords).toEqual([eatCookie, drinkCoffee]);
  ds.setSortBy((todo) => todo.title);
  expect(ds.sortedRecords).toEqual([drinkCoffee, eatCookie]);

  const aleph = {
    id: 'd',
    title: 'aleph',
  };
  ds.append(aleph);
  expect(ds.records).toEqual([eatCookie, drinkCoffee, aleph]);
  expect(ds.sortedRecords).toEqual([aleph, drinkCoffee, eatCookie]);
});

test('sorting preserves insertion order with equal keys', () => {
  type N = {
    $: string;
    name: string;
  };

  const a = {$: 'a', name: 'a'};
  const b1 = {$: 'b', name: 'b1'};
  const b2 = {$: 'b', name: 'b2'};
  const b3 = {$: 'b', name: 'b3'};
  const c = {$: 'c', name: 'c'};

  const ds = createDataSource<N>([]);
  ds.setSortBy('$');
  ds.append(b1);
  ds.append(c);
  ds.append(b2);
  ds.append(a);
  ds.append(b3);

  expect(ds.records).toEqual([b1, c, b2, a, b3]);
  expect(ds.sortedRecords).toEqual([a, b1, b2, b3, c]);

  // if we append a new item with existig item, it should end up in the end
  const b4 = {
    $: 'b',
    name: 'b4',
  };
  ds.append(b4);
  expect(ds.records).toEqual([b1, c, b2, a, b3, b4]);
  expect(ds.sortedRecords).toEqual([a, b1, b2, b3, b4, c]);

  // if we replace the middle item, it should end up in the middle
  const b2r = {
    $: 'b',
    name: 'b2replacement',
  };
  ds.update(2, b2r);
  expect(ds.records).toEqual([b1, c, b2r, a, b3, b4]);
  expect(ds.sortedRecords).toEqual([a, b1, b2r, b3, b4, c]);

  // if we replace something with a different sort value, it should be sorted properly, and the old should disappear
  const b3r = {
    $: 'aa',
    name: 'b3replacement',
  };
  ds.update(4, b3r);
  expect(ds.records).toEqual([b1, c, b2r, a, b3r, b4]);
  expect(ds.sortedRecords).toEqual([a, b3r, b1, b2r, b4, c]);
});

test('reverse without sorting', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee]);
  expect(ds.reversedRecords).toEqual([eatCookie, drinkCoffee]);

  ds.toggleReversed();
  expect(ds.reversedRecords).toEqual([drinkCoffee, eatCookie]);

  ds.append(submitBug);
  expect(ds.records).toEqual([eatCookie, drinkCoffee, submitBug]);
  expect(ds.reversedRecords).toEqual([submitBug, drinkCoffee, eatCookie]);

  const x = {id: 'x', title: 'x'};
  ds.update(0, x);
  expect(ds.records).toEqual([x, drinkCoffee, submitBug]);
  expect(ds.reversedRecords).toEqual([submitBug, drinkCoffee, x]);
  const y = {id: 'y', title: 'y'};
  const z = {id: 'z', title: 'z'};
  ds.update(2, z);
  ds.update(1, y);

  expect(ds.records).toEqual([x, y, z]);
  expect(ds.reversedRecords).toEqual([z, y, x]);

  ds.setReversed(false);
  expect(ds.reversedRecords).toEqual([x, y, z]);
});

test('reverse with sorting', () => {
  type N = {
    $: string;
    name: string;
  };

  const a = {$: 'a', name: 'a'};
  const b1 = {$: 'b', name: 'b1'};
  const b2 = {$: 'b', name: 'b2'};
  const b3 = {$: 'b', name: 'b3'};
  const c = {$: 'c', name: 'c'};

  const ds = createDataSource<N>([]);
  ds.setReversed(true);
  ds.append(b1);
  ds.append(c);
  expect(ds.sortedRecords).toEqual([b1, c]);
  expect(ds.reversedRecords).toEqual([c, b1]);

  ds.setSortBy('$');
  expect(ds.sortedRecords).toEqual([b1, c]);
  expect(ds.reversedRecords).toEqual([c, b1]);

  ds.append(b2);
  expect(ds.sortedRecords).toEqual([b1, b2, c]);
  expect(ds.reversedRecords).toEqual([c, b2, b1]);

  ds.append(a);
  expect(ds.sortedRecords).toEqual([a, b1, b2, c]);
  expect(ds.reversedRecords).toEqual([c, b2, b1, a]);

  ds.append(b3);
  expect(ds.sortedRecords).toEqual([a, b1, b2, b3, c]);
  expect(ds.reversedRecords).toEqual([c, b3, b2, b1, a]);

  // if we append a new item with existig item, it should end up in the end
  const b4 = {
    $: 'b',
    name: 'b4',
  };
  ds.append(b4);
  expect(ds.sortedRecords).toEqual([a, b1, b2, b3, b4, c]);
  expect(ds.reversedRecords).toEqual([c, b4, b3, b2, b1, a]);

  // if we replace the middle item, it should end up in the middle
  const b2r = {
    $: 'b',
    name: 'b2replacement',
  };
  ds.update(2, b2r);
  expect(ds.sortedRecords).toEqual([a, b1, b2r, b3, b4, c]);
  expect(ds.reversedRecords).toEqual([c, b4, b3, b2r, b1, a]);

  // if we replace something with a different sort value, it should be sorted properly, and the old should disappear
  const b3r = {
    $: 'aa',
    name: 'b3replacement',
  };
  ds.update(4, b3r);
  expect(ds.sortedRecords).toEqual([a, b3r, b1, b2r, b4, c]);
  expect(ds.reversedRecords).toEqual([c, b4, b2r, b1, b3r, a]);
});
