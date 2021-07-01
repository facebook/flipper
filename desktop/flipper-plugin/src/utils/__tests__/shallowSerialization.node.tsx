/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  makeShallowSerializable,
  deserializeShallowObject,
} from '../shallowSerialization';
import mockConsole from 'jest-mock-console';

class TestObject extends Object {
  constructor(title: Object, map?: Map<any, any>, set?: Set<any>) {
    super();
    this.title = title;
    this.map = map;
    this.set = set;
  }
  title: Object;
  map?: Map<any, any>;
  set?: Set<any>;
}

test('test cyclic data structure', () => {
  const a: any = {x: 0, b: {c: []}};
  a.b.c.push(a);
  expect(() => {
    makeShallowSerializable(a);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Cycle detected: object at path '.b.c.0' is referring to itself: '[object Object]'"`,
  );
});

test('test shared data structure', () => {
  const restoreConsole = mockConsole();
  try {
    const a = {hello: 'world'};
    const b = {x: a, y: a};

    const res = JSON.parse(JSON.stringify(makeShallowSerializable(b)));
    expect(res).toEqual({
      x: {hello: 'world'},
      y: {hello: 'world'},
    });
    expect(b.x).toBe(b.y);
    expect(res.x).not.toBe(res.y);
    // @ts-ignore
    expect(console.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Duplicate value, object lives at path '.y', but also at path '.x': '[object Object]'. This might not behave correct after import and lead to unnecessary big exports.",
        ],
      ]
    `);
  } finally {
    restoreConsole();
  }
});

test('test makeObjectSerializable function for unnested object with no Set and Map', () => {
  const obj = {key1: 'value1', key2: 'value2'};
  const output = makeShallowSerializable(obj);
  expect(output).toEqual(obj);

  // Testing numbers
  const obj2 = {key1: 1, key2: 2};
  const output2 = makeShallowSerializable(obj2);
  expect(output2).toEqual(obj2);
});

test('makeObjectSerializable function for unnested object with values which returns false when put in an if condition', () => {
  const obj2 = {key1: 0, key2: ''};
  const output2 = makeShallowSerializable(obj2);
  return expect(output2).toEqual(obj2);
});

test('test deserializeShallowObject function for unnested object with no Set and Map', () => {
  const obj = {key1: 'value1', key2: 'value2'};
  const output = deserializeShallowObject(obj);
  expect(output).toEqual(obj);

  // Testing numbers
  const obj2 = {key1: 1, key2: 2};
  const output2 = deserializeShallowObject(obj2);
  expect(output2).toEqual(obj2);
});

test('test makeObjectSerializable and deserializeShallowObject function for nested object with no Set and Map', () => {
  const subObj = {key1: 'value1', key2: 'value2'};
  const subObj2 = {key21: 'value21', key22: 'value22'};
  const obj = {key1: subObj, key2: subObj2};
  const output = makeShallowSerializable(obj);
  expect(output).toEqual(obj);
  expect(deserializeShallowObject(output)).toEqual(obj);

  const subObjNum = {key1: 1, key2: 2};
  const subObjNum2 = {key21: 21, key22: 22};
  const obj2 = {key1: subObjNum, key2: subObjNum2};
  const output2 = makeShallowSerializable(obj2);
  expect(output2).toEqual(obj2);
  expect(deserializeShallowObject(output2)).toEqual(obj2);
});

test('test makeObjectSerializable and deserializeShallowObject function for Map and Set with no nesting', () => {
  const map = new Map([
    ['k1', 'v1'],
    ['k2', 'v2'],
  ]);
  const output = makeShallowSerializable(map);
  const expected = {
    __flipper_object_type__: 'Map',
    data: [
      ['k1', 'v1'],
      ['k2', 'v2'],
    ],
  };
  expect(output).toEqual(expected);
  expect(deserializeShallowObject(output)).toEqual(map);

  const set = new Set([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
  const outputSet = makeShallowSerializable(set);
  const expectedSet = {
    __flipper_object_type__: 'Set',
    data: [1, 2, 3, 4, 5, 6],
  };
  expect(outputSet).toEqual(expectedSet);
  expect(deserializeShallowObject(outputSet)).toEqual(set);
});

test('test makeObjectSerializable and deserializeShallowObject function for Map and Set with nesting', () => {
  const map = new Map([
    [{title: 'k1'}, {title: 'v1'}],
    [{title: 'k2'}, {title: 'v2'}],
  ]);
  const output = makeShallowSerializable(map);
  const expected = {
    __flipper_object_type__: 'Map',
    data: [
      [{title: 'k1'}, {title: 'v1'}],
      [{title: 'k2'}, {title: 'v2'}],
    ],
  };
  expect(output).toEqual(expected);
  expect(deserializeShallowObject(output)).toEqual(map);

  const set = new Set([
    {title: '1'},
    {title: '2'},
    {title: '3'},
    {title: '4'},
    {title: '5'},
    {title: '6'},
  ]);
  const outputSet = makeShallowSerializable(set);
  const expectedSet = {
    __flipper_object_type__: 'Set',
    data: [
      {title: '1'},
      {title: '2'},
      {title: '3'},
      {title: '4'},
      {title: '5'},
      {title: '6'},
    ],
  };
  expect(outputSet).toEqual(expectedSet);
  expect(deserializeShallowObject(outputSet)).toEqual(set);
});

test('test makeObjectSerializable and deserializeShallowObject function for custom Object', () => {
  const obj = new TestObject('title');
  expect(() => {
    makeShallowSerializable(obj);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Unserializable object type (TestObject) at path '.': [object Object]."`,
  );
});

test('test makeObjectSerializable and deserializeShallowObject object with map', () => {
  const nestedObjWithMap = {
    map: new Map([
      ['k1', 'v1'],
      ['k2', 'v2'],
    ]),
  };
  expect(() => {
    makeShallowSerializable(nestedObjWithMap);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Unserializable object type (Map) at path '.map': [object Map]."`,
  );
});

test('test makeObjectSerializable and deserializeShallowObject function for Array as input', () => {
  const arr = [1, 2, 4, 5];
  const output = makeShallowSerializable(arr);
  expect(output).toEqual(arr);
  expect(deserializeShallowObject(output)).toEqual(arr);

  const arrMap = [
    new Map([
      ['a1', 'v1'],
      ['a2', 'v2'],
    ]),
  ];

  expect(() => {
    makeShallowSerializable(arrMap);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Unserializable object type (Map) at path '.0': [object Map]."`,
  );
});

test('test serialize and deserializeShallowObject function for non Object input', () => {
  expect(makeShallowSerializable('octopus')).toEqual('octopus');
  expect(deserializeShallowObject(makeShallowSerializable('octopus'))).toEqual(
    'octopus',
  );
  expect(makeShallowSerializable(24567)).toEqual(24567);
  expect(deserializeShallowObject(makeShallowSerializable(24567))).toEqual(
    24567,
  );
});

if (process.platform !== 'win32') {
  test('test makeObjectSerializable and deserializeShallowObject function for Date input', () => {
    const date = new Date(2021, 1, 29, 10, 31, 7, 205);
    expect(makeShallowSerializable(date)).toMatchInlineSnapshot(`
    Object {
      "__flipper_object_type__": "Date",
      "data": 1614555067205,
    }
  `);
    expect(deserializeShallowObject(makeShallowSerializable(date))).toEqual(
      date,
    );
  });
}

test('test makeObjectSerializable and deserializeShallowObject function for Map of Sets', () => {
  const map = new Map([
    ['k1', new Set([1, 2, 3, 4, 5, 6])],
    [new Set([1, 2]), new Map([['k3', 'v3']])],
  ] as any);
  expect(() => {
    makeShallowSerializable(map);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Unserializable object type (Set) at path '.01': [object Set]."`,
  );
});
