/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataSource, createDataSource} from '../DataSource';

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

function rawOutput<T>(ds: DataSource<T>): readonly T[] {
  // @ts-ignore
  const output = ds.view._output;
  return unwrap(output);
}

test('can create a datasource', () => {
  const ds = createDataSource<Todo>([eatCookie]);
  expect(ds.records()).toEqual([eatCookie]);

  ds.append(drinkCoffee);
  expect(ds.records()).toEqual([eatCookie, drinkCoffee]);

  // @ts-ignore
  expect(() => ds.getById('stuff')).toThrow(
    /Records cannot be looked up by key/,
  );

  ds.update(1, submitBug);
  expect(ds.records()[1]).toBe(submitBug);

  ds.delete(0);
  expect(ds.records()[0]).toBe(submitBug);
});

test('can create a keyed datasource', () => {
  const ds = createDataSource<Todo>([eatCookie], {key: 'id'});
  expect(ds.records()).toEqual([eatCookie]);

  ds.append(drinkCoffee);
  expect(ds.records()).toEqual([eatCookie, drinkCoffee]);

  expect(ds.getById('bug')).toBe(undefined);
  expect(ds.getById('cookie')).toBe(eatCookie);
  expect(ds.getById('coffee')).toBe(drinkCoffee);
  expect(ds.getIndexOfKey('bug')).toBe(-1);
  expect(ds.getIndexOfKey('cookie')).toBe(0);
  expect(ds.getIndexOfKey('coffee')).toBe(1);

  ds.update(1, submitBug);
  expect(ds.records()[1]).toBe(submitBug);
  expect(ds.getById('coffee')).toBe(undefined);
  expect(ds.getById('bug')).toBe(submitBug);
  expect(ds.getIndexOfKey('bug')).toBe(1);
  expect(ds.getIndexOfKey('cookie')).toBe(0);
  expect(ds.getIndexOfKey('coffee')).toBe(-1);

  // upsert existing
  const newBug = {
    id: 'bug',
    title: 'file a bug',
    done: true,
  };
  ds.upsert(newBug);
  expect(ds.records()[1]).toBe(newBug);
  expect(ds.getById('bug')).toBe(newBug);

  // upsert new
  const trash = {
    id: 'trash',
    title: 'take trash out',
  };
  ds.upsert(trash);
  expect(ds.records()[2]).toBe(trash);
  expect(ds.getById('trash')).toBe(trash);

  // delete by key
  expect(ds.records()).toEqual([eatCookie, newBug, trash]);
  expect(ds.deleteByKey('bug')).toBe(true);
  expect(ds.records()).toEqual([eatCookie, trash]);
  expect(ds.getIndexOfKey('bug')).toBe(-1);
  expect(ds.getIndexOfKey('cookie')).toBe(0);
  expect(ds.getIndexOfKey('trash')).toBe(1);
});

test('throws on invalid keys', () => {
  const ds = createDataSource<Todo>([eatCookie], {key: 'id'});
  expect(() => {
    ds.append({id: '', title: 'test'});
  }).toThrow(`Invalid key value: ''`);
  expect(() => {
    ds.append({id: 'cookie', title: 'test'});
  }).toThrow(`Duplicate key: 'cookie'`);
});

test('throws on update causing duplicate key', () => {
  const ds = createDataSource<Todo>([eatCookie, submitBug], {key: 'id'});
  expect(() => {
    ds.update(0, {id: 'bug', title: 'oops'});
  }).toThrow(
    `Trying to insert duplicate key 'bug', which already exist in the collection`,
  );
});

test('removing invalid keys', () => {
  const ds = createDataSource<Todo>([eatCookie], {key: 'id'});
  expect(ds.deleteByKey('trash')).toBe(false);
  expect(() => {
    ds.delete(1);
  }).toThrowError('Out of bounds');
});

test('sorting works', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee]);
  ds.view.setSortBy((todo) => todo.title);
  expect(rawOutput(ds)).toEqual([drinkCoffee, eatCookie]);

  ds.view.setSortBy(undefined);
  ds.view.setSortBy(undefined);
  expect(rawOutput(ds)).toEqual([eatCookie, drinkCoffee]);
  ds.view.setSortBy((todo) => todo.title);
  expect(rawOutput(ds)).toEqual([drinkCoffee, eatCookie]);

  const aleph = {
    id: 'd',
    title: 'aleph',
  };
  ds.append(aleph);
  expect(ds.records()).toEqual([eatCookie, drinkCoffee, aleph]);
  expect(rawOutput(ds)).toEqual([aleph, drinkCoffee, eatCookie]);
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
  ds.view.setSortBy('$');
  ds.append(b1);
  ds.append(c);
  ds.append(b2);
  ds.append(a);
  ds.append(b3);

  expect(ds.records()).toEqual([b1, c, b2, a, b3]);
  expect(rawOutput(ds)).toEqual([a, b1, b2, b3, c]);

  // if we append a new item with existig item, it should end up in the end
  const b4 = {
    $: 'b',
    name: 'b4',
  };
  ds.append(b4);
  expect(ds.records()).toEqual([b1, c, b2, a, b3, b4]);
  expect(rawOutput(ds)).toEqual([a, b1, b2, b3, b4, c]);

  // if we replace the middle item, it should end up in the middle
  const b2r = {
    $: 'b',
    name: 'b2replacement',
  };
  ds.update(2, b2r);
  expect(ds.records()).toEqual([b1, c, b2r, a, b3, b4]);
  expect(rawOutput(ds)).toEqual([a, b1, b2r, b3, b4, c]);

  // if we replace something with a different sort value, it should be sorted properly, and the old should disappear
  const b3r = {
    $: 'aa',
    name: 'b3replacement',
  };
  ds.update(4, b3r);
  expect(ds.records()).toEqual([b1, c, b2r, a, b3r, b4]);
  expect(rawOutput(ds)).toEqual([a, b3r, b1, b2r, b4, c]);

  ds.delete(3);
  expect(ds.records()).toEqual([b1, c, b2r, b3r, b4]);
  expect(rawOutput(ds)).toEqual([b3r, b1, b2r, b4, c]);
});

test('filter + sort', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee, submitBug]);

  ds.view.setFilter((t) => t.title.indexOf('c') === -1);
  ds.view.setSortBy('title');

  expect(rawOutput(ds)).toEqual([submitBug]);

  // append with and without filter
  const a = {id: 'a', title: 'does have that letter: c'};
  const b = {id: 'b', title: 'doesnt have that letter'};
  ds.append(a);
  expect(rawOutput(ds)).toEqual([submitBug]);
  ds.append(b);
  expect(rawOutput(ds)).toEqual([b, submitBug]);

  // filter in
  const newCookie = {
    id: 'cookie',
    title: 'eat a ookie',
  };
  ds.update(0, newCookie);
  expect(rawOutput(ds)).toEqual([b, newCookie, submitBug]);

  // update -> filter in
  const newCoffee = {
    id: 'coffee',
    title: 'better drink tea',
  };
  ds.append(newCoffee);
  expect(rawOutput(ds)).toEqual([newCoffee, b, newCookie, submitBug]);

  // update -> filter out
  ds.update(2, {id: 'bug', title: 'bug has c!'});
  expect(rawOutput(ds)).toEqual([newCoffee, b, newCookie]);

  ds.update(2, submitBug);
  expect(rawOutput(ds)).toEqual([newCoffee, b, newCookie, submitBug]);

  ds.delete(3); // a
  ds.delete(3); // b
  expect(rawOutput(ds)).toEqual([newCoffee, newCookie, submitBug]);

  ds.view.setFilter(undefined);
  expect(rawOutput(ds)).toEqual([newCoffee, drinkCoffee, newCookie, submitBug]);

  ds.view.setSortBy(undefined);
  // key insertion order
  expect(rawOutput(ds)).toEqual([newCookie, drinkCoffee, submitBug, newCoffee]);
});

test('filter + sort + index', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee, submitBug], {
    key: 'id',
  });

  ds.view.setFilter((t) => t.title.indexOf('c') === -1);
  ds.view.setSortBy('title');

  expect(rawOutput(ds)).toEqual([submitBug]);

  // append with and without filter
  const a = {id: 'a', title: 'does have that letter: c'};
  const b = {id: 'b', title: 'doesnt have that letter'};
  ds.append(a);
  expect(rawOutput(ds)).toEqual([submitBug]);
  ds.append(b);
  expect(rawOutput(ds)).toEqual([b, submitBug]);

  // filter in
  const newCookie = {
    id: 'cookie',
    title: 'eat a ookie',
  };
  ds.update(0, newCookie);
  expect(rawOutput(ds)).toEqual([b, newCookie, submitBug]);

  // update -> filter in
  const newCoffee = {
    id: 'coffee',
    title: 'better drink tea',
  };
  ds.upsert(newCoffee);
  expect(rawOutput(ds)).toEqual([newCoffee, b, newCookie, submitBug]);

  // update -> filter out
  ds.update(2, {id: 'bug', title: 'bug has c!'});
  expect(rawOutput(ds)).toEqual([newCoffee, b, newCookie]);

  ds.update(2, submitBug);
  expect(rawOutput(ds)).toEqual([newCoffee, b, newCookie, submitBug]);

  ds.view.setFilter(undefined);
  expect(rawOutput(ds)).toEqual([newCoffee, a, b, newCookie, submitBug]);

  ds.view.setSortBy(undefined);
  // key insertion order
  expect(rawOutput(ds)).toEqual([newCookie, newCoffee, submitBug, a, b]);
  // verify getOutput
  expect(rawOutput(ds).slice(1, 3)).toEqual([newCoffee, submitBug]);
  expect(ds.view.output(1, 3)).toEqual([newCoffee, submitBug]);
});

test('filter', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee, submitBug], {
    key: 'id',
  });

  ds.view.setFilter((t) => t.title.indexOf('c') === -1);
  expect(rawOutput(ds)).toEqual([submitBug]);

  // append with and without filter
  const a = {id: 'a', title: 'does have that letter: c'};
  const b = {id: 'b', title: 'doesnt have that letter'};
  ds.append(a);
  expect(rawOutput(ds)).toEqual([submitBug]);
  ds.append(b);
  expect(rawOutput(ds)).toEqual([submitBug, b]);

  // filter in
  const newCookie = {
    id: 'cookie',
    title: 'eat a ookie',
  };
  ds.update(0, newCookie);
  expect(rawOutput(ds)).toEqual([newCookie, submitBug, b]);

  // update -> filter in
  const newCoffee = {
    id: 'coffee',
    title: 'better drink tea',
  };
  ds.upsert(newCoffee);
  expect(rawOutput(ds)).toEqual([newCookie, newCoffee, submitBug, b]);

  // update -> filter out
  ds.update(2, {id: 'bug', title: 'bug has c!'});
  expect(rawOutput(ds)).toEqual([newCookie, newCoffee, b]);

  ds.update(2, submitBug);

  ds.view.setFilter(undefined);
  expect(rawOutput(ds)).toEqual([newCookie, newCoffee, submitBug, a, b]);
});

test('reverse without sorting', () => {
  const ds = createDataSource<Todo>([eatCookie, drinkCoffee]);
  ds.view.setWindow(0, 100);
  expect(ds.view.output()).toEqual([eatCookie, drinkCoffee]);

  ds.view.toggleReversed();
  expect(ds.view.output(1, 2)).toEqual([eatCookie]);
  expect(ds.view.output(0, 1)).toEqual([drinkCoffee]);
  expect(ds.view.output(0, 2)).toEqual([drinkCoffee, eatCookie]);

  expect(ds.view.output()).toEqual([drinkCoffee, eatCookie]);

  ds.append(submitBug);
  expect(ds.records()).toEqual([eatCookie, drinkCoffee, submitBug]);
  expect(ds.view.output()).toEqual([submitBug, drinkCoffee, eatCookie]);

  const x = {id: 'x', title: 'x'};
  ds.update(0, x);
  expect(ds.records()).toEqual([x, drinkCoffee, submitBug]);
  expect(ds.view.output()).toEqual([submitBug, drinkCoffee, x]);
  const y = {id: 'y', title: 'y'};
  const z = {id: 'z', title: 'z'};
  ds.update(2, z);
  ds.update(1, y);

  expect(ds.records()).toEqual([x, y, z]);
  expect(ds.view.output()).toEqual([z, y, x]);

  ds.view.setReversed(false);
  expect(ds.view.output()).toEqual([x, y, z]);
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
  ds.view.setWindow(0, 100);
  ds.view.setReversed(true);
  ds.append(b1);
  ds.append(c);
  expect(ds.view.output()).toEqual([c, b1]);

  ds.view.setSortBy('$');
  expect(ds.view.output()).toEqual([c, b1]);

  ds.append(b2);
  expect(ds.view.output()).toEqual([c, b2, b1]);

  ds.append(a);
  expect(ds.view.output()).toEqual([c, b2, b1, a]);

  ds.append(b3);
  expect(ds.view.output()).toEqual([c, b3, b2, b1, a]);

  // if we append a new item with existig item, it should end up in the end
  const b4 = {
    $: 'b',
    name: 'b4',
  };
  ds.append(b4);
  expect(ds.view.output()).toEqual([c, b4, b3, b2, b1, a]);

  // if we replace the middle item, it should end up in the middle
  const b2r = {
    $: 'b',
    name: 'b2replacement',
  };
  ds.update(2, b2r);
  expect(ds.view.output()).toEqual([c, b4, b3, b2r, b1, a]);

  // if we replace something with a different sort value, it should be sorted properly, and the old should disappear
  const b3r = {
    $: 'aa',
    name: 'b3replacement',
  };
  ds.update(4, b3r);
  expect(ds.view.output()).toEqual([c, b4, b2r, b1, b3r, a]);

  ds.delete(4);
  expect(ds.view.output()).toEqual([c, b4, b2r, b1, a]);
});

test('reset', () => {
  const ds = createDataSource<Todo>([submitBug, drinkCoffee, eatCookie], {
    key: 'id',
  });
  ds.view.setSortBy('title');
  ds.view.setFilter((v) => v.id !== 'cookie');
  expect(rawOutput(ds)).toEqual([drinkCoffee, submitBug]);
  expect([...ds.keys()]).toEqual(['bug', 'coffee', 'cookie']);

  ds.view.reset();
  expect(rawOutput(ds)).toEqual([submitBug, drinkCoffee, eatCookie]);
  expect([...ds.keys()]).toEqual(['bug', 'coffee', 'cookie']);
});

test('clear', () => {
  const ds = createDataSource<Todo>([submitBug, drinkCoffee, eatCookie], {
    key: 'id',
  });
  ds.view.setSortBy('title');
  ds.view.setFilter((v) => v.id !== 'cookie');
  expect(rawOutput(ds)).toEqual([drinkCoffee, submitBug]);
  expect([...ds.keys()]).toEqual(['bug', 'coffee', 'cookie']);

  ds.clear();
  expect(rawOutput(ds)).toEqual([]);
  expect([...ds.keys()]).toEqual([]);

  ds.append(eatCookie);
  ds.append(drinkCoffee);
  ds.append(submitBug);
  expect([...ds.keys()]).toEqual(['cookie', 'coffee', 'bug']);
  // resets in the same ordering as view preferences were preserved
  expect(rawOutput(ds)).toEqual([drinkCoffee, submitBug]);
});

function testEvents<T>(
  initial: T[],
  op: (ds: DataSource<T>) => void,
  key?: keyof T,
): any[] {
  const ds = createDataSource<T>(initial, {key});
  const events: any[] = [];
  ds.view.setListener((e) => events.push(e));
  op(ds);
  ds.view.setListener(undefined);
  return events;
}

test('it emits the right events - zero window', () => {
  expect(
    testEvents(['a', 'b'], (ds) => {
      ds.append('c');
      ds.update(1, 'x');
    }),
  ).toEqual([
    {
      delta: 1,
      index: 2,
      location: 'after',
      newCount: 3,
      type: 'shift',
    },
  ]);
});

test('it emits the right events - small window', () => {
  expect(
    testEvents(['a', 'b'], (ds) => {
      ds.view.setWindow(0, 3);
      ds.append('c');
      ds.update(1, 'x');
    }),
  ).toEqual([
    {delta: 1, location: 'in', newCount: 3, type: 'shift', index: 2},
    {index: 1, type: 'update'},
  ]);
});

test('it emits the right events - view change', () => {
  expect(
    testEvents(['a', 'b'], (ds) => {
      ds.view.setWindow(1, 2);
      ds.view.setSortBy((x) => x);
      // a, [b]
      ds.update(0, 'x');
      // b, [x]
      expect(ds.view.get(0)).toEqual('b');
      expect(ds.view.get(1)).toEqual('x');
      ds.append('y');
      // b, [x], y
      ds.append('c');
      // b, [c], x, y
    }),
  ).toEqual([
    {newCount: 2, type: 'reset'},
    {index: 0, delta: -1, location: 'before', newCount: 1, type: 'shift'}, // remove a
    {index: 1, delta: 1, location: 'in', newCount: 2, type: 'shift'}, // pre-insert x
    {index: 2, delta: 1, location: 'after', newCount: 3, type: 'shift'}, // y happened after
    {index: 1, delta: 1, location: 'in', newCount: 4, type: 'shift'}, // c becomes the 'in' new indow
  ]);
});

test('it emits the right events - reversed view change', () => {
  expect(
    testEvents(['a', 'b'], (ds) => {
      ds.view.setWindow(1, 2);
      ds.view.setSortBy((x) => x);
      ds.view.setReversed(true);
      // b, [a]
      ds.update(0, 'x');
      // x, [b]
      expect(ds.view.get(0)).toEqual('x');
      expect(ds.view.get(1)).toEqual('b');
      ds.append('y');
      // y, [x], b
      ds.append('c');
      // y, [x], c, b
      ds.append('a');
      // y, [x], c, b, a
    }),
  ).toEqual([
    {newCount: 2, type: 'reset'},
    {newCount: 2, type: 'reset'}, // FIXME: ideally dedupe these, but due to scheduling will do little harm
    {index: 1, delta: -1, location: 'in', newCount: 1, type: 'shift'}, // remove a
    {index: 0, delta: 1, location: 'before', newCount: 2, type: 'shift'}, // pre-insert x
    {index: 0, delta: 1, location: 'before', newCount: 3, type: 'shift'},
    {index: 2, delta: 1, location: 'after', newCount: 4, type: 'shift'},
    {index: 4, delta: 1, location: 'after', newCount: 5, type: 'shift'},
  ]);
});

test('it emits the right events - reversed view change with filter', () => {
  expect(
    testEvents(['a', 'b'], (ds) => {
      ds.view.setWindow(0, 2);
      ds.view.setSortBy((x) => x);
      ds.view.setReversed(true);
      ds.view.setFilter((x) => ['a', 'b'].includes(x));
      // [b, a]
      ds.update(0, 'x'); // x b
      // [b, ]
      expect(ds.view.get(0)).toEqual('b');
      expect(rawOutput(ds).length).toBe(1);
      ds.append('y'); // x b y
      // [b, ]
      ds.append('c'); // x b y c
      // [b, ]
      ds.append('a'); // x b y c a
      // [b, a]
      ds.append('a'); // x b y c a a
      // [b, a, a] // N.b. the new a is in the *middle*
      ds.delete(2); // x b c a a
      // no effect
      ds.delete(4); // this removes the second a in input, so the first a in the outpat!
      // [b, a]
    }),
  ).toEqual([
    {newCount: 2, type: 'reset'},
    {newCount: 2, type: 'reset'}, // FIXME: ideally dedupe these, but due to scheduling will do little harm
    {newCount: 2, type: 'reset'}, // FIXME: ideally dedupe these, but due to scheduling will do little harm
    {index: 1, delta: -1, location: 'in', newCount: 1, type: 'shift'}, // remove a
    {index: 1, delta: 1, location: 'in', newCount: 2, type: 'shift'},
    {index: 1, delta: 1, location: 'in', newCount: 3, type: 'shift'},
    {index: 1, delta: -1, location: 'in', newCount: 2, type: 'shift'},
  ]);
});

test('basic remove', () => {
  const completedBug = {id: 'bug', title: 'fixed bug', done: true};
  expect(
    testEvents(
      [drinkCoffee, eatCookie, submitBug],
      (ds) => {
        ds.view.setWindow(0, 100);
        ds.delete(0);
        expect(ds.view.output()).toEqual([eatCookie, submitBug]);
        expect(ds.getById('bug')).toBe(submitBug);
        expect(ds.getById('coffee')).toBeUndefined();
        expect(ds.getById('cookie')).toBe(eatCookie);
        ds.upsert(completedBug);
        ds.deleteByKey('cookie');
        expect(ds.view.output()).toEqual([completedBug]);
        expect(ds.getById('bug')).toBe(completedBug);
      },
      'id',
    ),
  ).toEqual([
    {
      type: 'shift',
      newCount: 2,
      location: 'in',
      index: 0,
      delta: -1,
    },
    {
      type: 'update',
      index: 1,
    },
    {
      type: 'shift',
      index: 0,
      location: 'in',
      newCount: 1,
      delta: -1,
    },
  ]);
});

test('basic shift', () => {
  const completedBug = {id: 'bug', title: 'fixed bug', done: true};
  expect(
    testEvents(
      [drinkCoffee, eatCookie, submitBug],
      (ds) => {
        ds.view.setWindow(0, 100);
        ds.shift(2);
        expect(ds.view.output()).toEqual([submitBug]);
        expect(ds.getById('bug')).toBe(submitBug);
        expect(ds.getById('coffee')).toBeUndefined();
        expect(ds.getIndexOfKey('bug')).toBe(0);
        expect(ds.getIndexOfKey('coffee')).toBe(-1);
        ds.upsert(completedBug);
        expect(ds.view.output()).toEqual([completedBug]);
        expect(ds.getById('bug')).toBe(completedBug);
      },
      'id',
    ),
  ).toEqual([
    {
      type: 'shift',
      newCount: 1,
      location: 'in',
      index: 0,
      delta: -2,
    },
    {
      type: 'update',
      index: 0,
    },
  ]);
});

test('sorted shift', () => {
  expect(
    testEvents(['c', 'b', 'a', 'e', 'd'], (ds) => {
      ds.view.setWindow(0, 100);
      ds.view.setSortBy((v) => v);
      expect(ds.view.output()).toEqual(['a', 'b', 'c', 'd', 'e']);
      ds.shift(4);
      expect(ds.view.output()).toEqual(['d']);
      ds.shift(1); // optimizes to reset
    }),
  ).toEqual([
    {newCount: 5, type: 'reset'}, // sort
    {delta: -1, index: 4, location: 'in', newCount: 4, type: 'shift'}, // e
    {delta: -1, index: 0, location: 'in', newCount: 3, type: 'shift'}, // a
    {delta: -1, index: 0, location: 'in', newCount: 2, type: 'shift'}, // b
    {delta: -1, index: 0, location: 'in', newCount: 1, type: 'shift'}, // c
    {newCount: 0, type: 'reset'}, // shift that clears
  ]);
});

test('filtered shift', () => {
  expect(
    testEvents(['c', 'b', 'a', 'e', 'd'], (ds) => {
      ds.view.setWindow(0, 100);
      ds.view.setFilter((v) => v !== 'b' && v !== 'e');
      expect(ds.view.output()).toEqual(['c', 'a', 'd']);
      ds.shift(4);
      expect(ds.view.output()).toEqual(['d']);
    }),
  ).toEqual([
    {newCount: 3, type: 'reset'}, // filter
    {type: 'shift', location: 'in', newCount: 1, index: 0, delta: -2}, // optimized shift
  ]);
});

test('remove after shift works correctly', () => {
  const a: Todo = {id: 'a', title: 'a', done: false};
  const b: Todo = {id: 'b', title: 'b', done: false};

  expect(
    testEvents(
      [eatCookie, drinkCoffee, submitBug, a, b],
      (ds) => {
        ds.view.setWindow(0, 100);
        ds.shift(2);
        ds.deleteByKey('b');
        ds.deleteByKey('bug');
        expect(ds.view.output()).toEqual([a]);
        expect(ds.getIndexOfKey('cookie')).toBe(-1);
        expect(ds.getIndexOfKey('coffee')).toBe(-1);
        expect(ds.getIndexOfKey('bug')).toBe(-1);
        expect(ds.getIndexOfKey('a')).toBe(0);
        expect(ds.getIndexOfKey('b')).toBe(-1);
      },
      'id',
    ),
  ).toEqual([
    {
      type: 'shift',
      newCount: 3,
      location: 'in',
      index: 0,
      delta: -2,
    },
    {
      type: 'shift',
      newCount: 2,
      location: 'in',
      index: 2,
      delta: -1,
    },
    {
      type: 'shift',
      newCount: 1,
      location: 'in',
      index: 0,
      delta: -1,
    },
  ]);
});

test('respects limit', () => {
  const grab = (): [length: number, first: number, last: number] => {
    const output = ds.view.output();
    return [output.length, output[0], output[output.length - 1]];
  };

  const ds = createDataSource(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    {limit: 20},
  );
  ds.view.setWindow(0, 100);

  ds.append(19);
  ds.append(20);
  expect(grab()).toEqual([20, 1, 20]);

  ds.append(21);
  expect(grab()).toEqual([19, 3, 21]);
  ds.append(22);
  expect(grab()).toEqual([20, 3, 22]);

  ds.delete(0);
  expect(grab()).toEqual([19, 4, 22]);

  ds.append(23);
  expect(grab()).toEqual([20, 4, 23]);
  ds.append(24);
  expect(grab()).toEqual([19, 6, 24]);
});

test('DataSource can iterate', () => {
  const ds = createDataSource([eatCookie, drinkCoffee], {key: 'id'});

  expect([...ds]).toEqual([eatCookie, drinkCoffee]);
  expect(Array.from(ds.keys())).toEqual(['cookie', 'coffee']);
  expect(Array.from(ds.entries())).toEqual([
    ['cookie', eatCookie],
    ['coffee', drinkCoffee],
  ]);

  const seen: Todo[] = [];
  for (const todo of ds) {
    seen.push(todo);
  }
  expect(seen).toEqual([eatCookie, drinkCoffee]);

  ds.append(submitBug);
  expect([...ds]).toEqual([eatCookie, drinkCoffee, submitBug]);

  ds.clear();
  expect([...ds]).toEqual([]);

  ds.append(submitBug);
  expect([...ds]).toEqual([submitBug]);
});

test('DataSource.view can iterate', () => {
  const ds = createDataSource([eatCookie, drinkCoffee, submitBug, eatCookie]);
  ds.view.setSortBy('id');
  // bug coffee cookie cookie
  ds.view.toggleReversed();
  // cookie cookie coffee bug
  ds.view.setWindow(1, 3);
  // cookie coffee

  expect(ds.view.output()).toEqual([eatCookie, drinkCoffee]);
  expect([...ds.view]).toEqual([eatCookie, drinkCoffee]);

  ds.view.reset();
  // default window is empty!
  expect([...ds.view]).toEqual([]);
  ds.view.setWindow(0, 100);
  expect([...ds.view]).toEqual([eatCookie, drinkCoffee, submitBug, eatCookie]);

  ds.clear();
  expect([...ds.view]).toEqual([]);
});
