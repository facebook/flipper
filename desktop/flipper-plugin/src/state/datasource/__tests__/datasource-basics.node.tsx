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

function unwrap<T>(array: readonly {value: T}[]): readonly T[] {
  return array.map((entry) => entry.value);
}

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
  expect(unwrap(ds.output)).toEqual([drinkCoffee, eatCookie]);

  ds.setSortBy(undefined);
  ds.setSortBy(undefined);
  expect(unwrap(ds.output)).toEqual([eatCookie, drinkCoffee]);
  ds.setSortBy((todo) => todo.title);
  expect(unwrap(ds.output)).toEqual([drinkCoffee, eatCookie]);

  const aleph = {
    id: 'd',
    title: 'aleph',
  };
  ds.append(aleph);
  expect(ds.records).toEqual([eatCookie, drinkCoffee, aleph]);
  expect(unwrap(ds.output)).toEqual([aleph, drinkCoffee, eatCookie]);
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
  expect(unwrap(ds.output)).toEqual([a, b1, b2, b3, c]);

  // if we append a new item with existig item, it should end up in the end
  const b4 = {
    $: 'b',
    name: 'b4',
  };
  ds.append(b4);
  expect(ds.records).toEqual([b1, c, b2, a, b3, b4]);
  expect(unwrap(ds.output)).toEqual([a, b1, b2, b3, b4, c]);

  // if we replace the middle item, it should end up in the middle
  const b2r = {
    $: 'b',
    name: 'b2replacement',
  };
  ds.update(2, b2r);
  expect(ds.records).toEqual([b1, c, b2r, a, b3, b4]);
  expect(unwrap(ds.output)).toEqual([a, b1, b2r, b3, b4, c]);

  // if we replace something with a different sort value, it should be sorted properly, and the old should disappear
  const b3r = {
    $: 'aa',
    name: 'b3replacement',
  };
  ds.update(4, b3r);
  expect(ds.records).toEqual([b1, c, b2r, a, b3r, b4]);
  expect(unwrap(ds.output)).toEqual([a, b3r, b1, b2r, b4, c]);
});

test('filter + sort', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee, submitBug]);

  ds.setFilter((t) => t.title.indexOf('c') === -1);
  ds.setSortBy('title');

  expect(unwrap(ds.output)).toEqual([submitBug]);

  // append with and without filter
  const a = {id: 'a', title: 'does have that letter: c'};
  const b = {id: 'b', title: 'doesnt have that letter'};
  ds.append(a);
  expect(unwrap(ds.output)).toEqual([submitBug]);
  ds.append(b);
  expect(unwrap(ds.output)).toEqual([b, submitBug]);

  // filter in
  const newCookie = {
    id: 'cookie',
    title: 'eat a ookie',
  };
  ds.update(0, newCookie);
  expect(unwrap(ds.output)).toEqual([b, newCookie, submitBug]);

  // update -> filter in
  const newCoffee = {
    id: 'coffee',
    title: 'better drink tea',
  };
  ds.append(newCoffee);
  expect(unwrap(ds.output)).toEqual([newCoffee, b, newCookie, submitBug]);

  // update -> filter out
  ds.update(2, {id: 'bug', title: 'bug has c!'});
  expect(unwrap(ds.output)).toEqual([newCoffee, b, newCookie]);

  ds.update(2, submitBug);
  expect(unwrap(ds.output)).toEqual([newCoffee, b, newCookie, submitBug]);

  ds.setFilter(undefined);
  expect(unwrap(ds.output)).toEqual([
    newCoffee,
    a,
    b,
    drinkCoffee,
    newCookie,
    submitBug,
  ]);

  ds.setSortBy(undefined);
  // key insertion order
  expect(unwrap(ds.output)).toEqual([
    newCookie,
    drinkCoffee,
    submitBug,
    a,
    b,
    newCoffee,
  ]);
});

test('filter + sort + index', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee, submitBug], 'id');

  ds.setFilter((t) => t.title.indexOf('c') === -1);
  ds.setSortBy('title');

  expect(unwrap(ds.output)).toEqual([submitBug]);

  // append with and without filter
  const a = {id: 'a', title: 'does have that letter: c'};
  const b = {id: 'b', title: 'doesnt have that letter'};
  ds.append(a);
  expect(unwrap(ds.output)).toEqual([submitBug]);
  ds.append(b);
  expect(unwrap(ds.output)).toEqual([b, submitBug]);

  // filter in
  const newCookie = {
    id: 'cookie',
    title: 'eat a ookie',
  };
  ds.update(0, newCookie);
  expect(unwrap(ds.output)).toEqual([b, newCookie, submitBug]);

  // update -> filter in
  const newCoffee = {
    id: 'coffee',
    title: 'better drink tea',
  };
  ds.upsert(newCoffee);
  expect(unwrap(ds.output)).toEqual([newCoffee, b, newCookie, submitBug]);

  // update -> filter out
  ds.update(2, {id: 'bug', title: 'bug has c!'});
  expect(unwrap(ds.output)).toEqual([newCoffee, b, newCookie]);

  ds.update(2, submitBug);
  expect(unwrap(ds.output)).toEqual([newCoffee, b, newCookie, submitBug]);

  ds.setFilter(undefined);
  expect(unwrap(ds.output)).toEqual([newCoffee, a, b, newCookie, submitBug]);

  ds.setSortBy(undefined);
  // key insertion order
  expect(unwrap(ds.output)).toEqual([newCookie, newCoffee, submitBug, a, b]);
});

test('filter', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee, submitBug], 'id');

  ds.setFilter((t) => t.title.indexOf('c') === -1);
  expect(unwrap(ds.output)).toEqual([submitBug]);

  // append with and without filter
  const a = {id: 'a', title: 'does have that letter: c'};
  const b = {id: 'b', title: 'doesnt have that letter'};
  ds.append(a);
  expect(unwrap(ds.output)).toEqual([submitBug]);
  ds.append(b);
  expect(unwrap(ds.output)).toEqual([submitBug, b]);

  // filter in
  const newCookie = {
    id: 'cookie',
    title: 'eat a ookie',
  };
  ds.update(0, newCookie);
  expect(unwrap(ds.output)).toEqual([newCookie, submitBug, b]);

  // update -> filter in
  const newCoffee = {
    id: 'coffee',
    title: 'better drink tea',
  };
  ds.upsert(newCoffee);
  expect(unwrap(ds.output)).toEqual([newCookie, newCoffee, submitBug, b]);

  // update -> filter out
  ds.update(2, {id: 'bug', title: 'bug has c!'});
  expect(unwrap(ds.output)).toEqual([newCookie, newCoffee, b]);

  ds.update(2, submitBug);

  ds.setFilter(undefined);
  expect(unwrap(ds.output)).toEqual([newCookie, newCoffee, submitBug, a, b]);
});

test.skip('reverse without sorting', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee]);
  expect(unwrap(ds.output)).toEqual([eatCookie, drinkCoffee]);

  ds.toggleReversed();
  expect(unwrap(ds.output)).toEqual([drinkCoffee, eatCookie]);

  ds.append(submitBug);
  expect(ds.records).toEqual([eatCookie, drinkCoffee, submitBug]);
  expect(unwrap(ds.output)).toEqual([submitBug, drinkCoffee, eatCookie]);

  const x = {id: 'x', title: 'x'};
  ds.update(0, x);
  expect(ds.records).toEqual([x, drinkCoffee, submitBug]);
  expect(unwrap(ds.output)).toEqual([submitBug, drinkCoffee, x]);
  const y = {id: 'y', title: 'y'};
  const z = {id: 'z', title: 'z'};
  ds.update(2, z);
  ds.update(1, y);

  expect(ds.records).toEqual([x, y, z]);
  expect(unwrap(ds.output)).toEqual([z, y, x]);

  ds.setReversed(false);
  expect(unwrap(ds.output)).toEqual([x, y, z]);
});

test.skip('reverse with sorting', () => {
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
  expect(unwrap(ds.output)).toEqual([c, b1]);

  ds.setSortBy('$');
  expect(unwrap(ds.output)).toEqual([c, b1]);

  ds.append(b2);
  expect(unwrap(ds.output)).toEqual([c, b2, b1]);

  ds.append(a);
  expect(unwrap(ds.output)).toEqual([c, b2, b1, a]);

  ds.append(b3);
  expect(unwrap(ds.output)).toEqual([c, b3, b2, b1, a]);

  // if we append a new item with existig item, it should end up in the end
  const b4 = {
    $: 'b',
    name: 'b4',
  };
  ds.append(b4);
  expect(unwrap(ds.output)).toEqual([c, b4, b3, b2, b1, a]);

  // if we replace the middle item, it should end up in the middle
  const b2r = {
    $: 'b',
    name: 'b2replacement',
  };
  ds.update(2, b2r);
  expect(unwrap(ds.output)).toEqual([c, b4, b3, b2r, b1, a]);

  // if we replace something with a different sort value, it should be sorted properly, and the old should disappear
  const b3r = {
    $: 'aa',
    name: 'b3replacement',
  };
  ds.update(4, b3r);
  expect(unwrap(ds.output)).toEqual([c, b4, b2r, b1, b3r, a]);
});

test('reset', () => {
  const ds = createDataSource<Todo>([submitBug, drinkCoffee, eatCookie], 'id');
  ds.setSortBy('title');
  ds.setFilter((v) => v.id !== 'cookie');
  expect(unwrap(ds.output)).toEqual([drinkCoffee, submitBug]);
  expect([...ds.recordsById.keys()]).toEqual(['bug', 'coffee', 'cookie']);

  ds.reset();
  expect(unwrap(ds.output)).toEqual([submitBug, drinkCoffee, eatCookie]);
  expect([...ds.recordsById.keys()]).toEqual(['bug', 'coffee', 'cookie']);
});

test('clear', () => {
  const ds = createDataSource<Todo>([submitBug, drinkCoffee, eatCookie], 'id');
  ds.setSortBy('title');
  ds.setFilter((v) => v.id !== 'cookie');
  expect(unwrap(ds.output)).toEqual([drinkCoffee, submitBug]);
  expect([...ds.recordsById.keys()]).toEqual(['bug', 'coffee', 'cookie']);

  ds.clear();
  expect(unwrap(ds.output)).toEqual([]);
  expect([...ds.recordsById.keys()]).toEqual([]);

  ds.append(eatCookie);
  ds.append(drinkCoffee);
  ds.append(submitBug);
  expect([...ds.recordsById.keys()]).toEqual(['cookie', 'coffee', 'bug']);
  // resets in the same ordering as view preferences were preserved
  expect(unwrap(ds.output)).toEqual([drinkCoffee, submitBug]);
});
