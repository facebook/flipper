/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {makeObjectSerializable, deserializeObject} from '../serialization';

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
test('test makeObjectSerializable function for unnested object with no Set and Map', async () => {
  const obj = {key1: 'value1', key2: 'value2'};
  const output = await makeObjectSerializable(obj);
  expect(output).toEqual(obj);

  // Testing numbers
  const obj2 = {key1: 1, key2: 2};
  const output2 = await makeObjectSerializable(obj2);
  expect(output2).toEqual(obj2);
});

test('makeObjectSerializable function for unnested object with values which returns false when put in an if condition', async () => {
  const obj2 = {key1: 0, key2: ''};
  const output2 = await makeObjectSerializable(obj2);
  return expect(output2).toEqual(obj2);
});

test('test deserializeObject function for unnested object with no Set and Map', () => {
  const obj = {key1: 'value1', key2: 'value2'};
  const output = deserializeObject(obj);
  expect(output).toEqual(obj);

  // Testing numbers
  const obj2 = {key1: 1, key2: 2};
  const output2 = deserializeObject(obj2);
  expect(output2).toEqual(obj2);
});

test('test makeObjectSerializable and deserializeObject function for nested object with no Set and Map', async () => {
  const subObj = {key1: 'value1', key2: 'value2'};
  const subObj2 = {key21: 'value21', key22: 'value22'};
  const obj = {key1: subObj, key2: subObj2};
  const output = await makeObjectSerializable(obj);
  expect(output).toEqual(obj);
  expect(deserializeObject(output)).toEqual(obj);

  const subObjNum = {key1: 1, key2: 2};
  const subObjNum2 = {key21: 21, key22: 22};
  const obj2 = {key1: subObjNum, key2: subObjNum2};
  const output2 = await makeObjectSerializable(obj2);
  expect(output2).toEqual(obj2);
  expect(deserializeObject(output2)).toEqual(obj2);
});

test('test makeObjectSerializable and deserializeObject function for Map and Set with no nesting', async () => {
  const map = new Map([
    ['k1', 'v1'],
    ['k2', 'v2'],
  ]);
  const output = await makeObjectSerializable(map);
  const expected = {
    __flipper_object_type__: 'Map',
    data: [
      ['k1', 'v1'],
      ['k2', 'v2'],
    ],
  };
  expect(output).toEqual(expected);
  expect(deserializeObject(output)).toEqual(map);

  const set = new Set([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
  const outputSet = await makeObjectSerializable(set);
  const expectedSet = {
    __flipper_object_type__: 'Set',
    data: [1, 2, 3, 4, 5, 6],
  };
  expect(outputSet).toEqual(expectedSet);
  expect(deserializeObject(outputSet)).toEqual(set);
});

test('test makeObjectSerializable and deserializeObject function for Map and Set with nesting', async () => {
  const map = new Map([
    [{title: 'k1'}, {title: 'v1'}],
    [{title: 'k2'}, {title: 'v2'}],
  ]);
  const output = await makeObjectSerializable(map);
  const expected = {
    __flipper_object_type__: 'Map',
    data: [
      [{title: 'k1'}, {title: 'v1'}],
      [{title: 'k2'}, {title: 'v2'}],
    ],
  };
  expect(output).toEqual(expected);
  expect(deserializeObject(output)).toEqual(map);

  const set = new Set([
    {title: '1'},
    {title: '2'},
    {title: '3'},
    {title: '4'},
    {title: '5'},
    {title: '6'},
  ]);
  const outputSet = await makeObjectSerializable(set);
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
  expect(deserializeObject(outputSet)).toEqual(set);
});

test('test makeObjectSerializable and deserializeObject function for custom Object', async () => {
  const obj = new TestObject('title');
  const output = await makeObjectSerializable(obj);
  expect(output).toEqual(obj);
  expect(deserializeObject(output)).toEqual(obj);

  const nestedObj = new TestObject({title: 'nestedTitle'});
  const nestedoutput = await makeObjectSerializable(nestedObj);
  expect(nestedoutput).toEqual(nestedObj);
  expect(deserializeObject(nestedoutput)).toEqual(nestedObj);

  const nestedObjWithMap = new TestObject(
    {title: 'nestedTitle'},
    new Map([
      ['k1', 'v1'],
      ['k2', 'v2'],
    ]),
  );
  const nestedObjWithMapOutput = await makeObjectSerializable(nestedObjWithMap);
  const expectedNestedObjWithMapOutput = {
    title: {title: 'nestedTitle'},
    map: {
      __flipper_object_type__: 'Map',
      data: [
        ['k1', 'v1'],
        ['k2', 'v2'],
      ],
    },
    set: undefined,
  };
  expect(nestedObjWithMapOutput).toEqual(expectedNestedObjWithMapOutput);
  expect(deserializeObject(nestedObjWithMapOutput)).toEqual(nestedObjWithMap);

  const nestedObjWithMapSet = new TestObject(
    {title: 'nestedTitle'},
    new Map([
      ['k1', 'v1'],
      ['k2', 'v2'],
    ]),
    new Set([
      {title: '1'},
      {title: '2'},
      {title: '3'},
      {title: '4'},
      {title: '5'},
      {title: '6'},
    ]),
  );
  const nestedObjWithMapSetOutput = await makeObjectSerializable(
    nestedObjWithMapSet,
  );
  const expectedNestedObjWithMapSetOutput = {
    title: {title: 'nestedTitle'},
    map: {
      __flipper_object_type__: 'Map',
      data: [
        ['k1', 'v1'],
        ['k2', 'v2'],
      ],
    },
    set: {
      __flipper_object_type__: 'Set',
      data: [
        {title: '1'},
        {title: '2'},
        {title: '3'},
        {title: '4'},
        {title: '5'},
        {title: '6'},
      ],
    },
  };
  expect(nestedObjWithMapSetOutput).toEqual(expectedNestedObjWithMapSetOutput);
  expect(deserializeObject(nestedObjWithMapSetOutput)).toEqual(
    nestedObjWithMapSet,
  );
});

test('test makeObjectSerializable and deserializeObject function for Array as input', async () => {
  const arr = [1, 2, 4, 5];
  const output = await makeObjectSerializable(arr);
  expect(output).toEqual(arr);
  expect(deserializeObject(output)).toEqual(arr);

  const arrMap = [
    new Map([
      ['a1', 'v1'],
      ['a2', 'v2'],
    ]),
    new Map([
      ['b1', 'v1'],
      ['b2', 'v2'],
    ]),
    new Map([
      ['c1', 'v1'],
      ['c2', 'v2'],
    ]),
    new Map([
      ['d1', 'v1'],
      ['d2', 'v2'],
    ]),
  ];

  const expectedArr = [
    {
      __flipper_object_type__: 'Map',
      data: [
        ['a1', 'v1'],
        ['a2', 'v2'],
      ],
    },
    {
      __flipper_object_type__: 'Map',
      data: [
        ['b1', 'v1'],
        ['b2', 'v2'],
      ],
    },
    {
      __flipper_object_type__: 'Map',
      data: [
        ['c1', 'v1'],
        ['c2', 'v2'],
      ],
    },
    {
      __flipper_object_type__: 'Map',
      data: [
        ['d1', 'v1'],
        ['d2', 'v2'],
      ],
    },
  ];
  const outputMap = await makeObjectSerializable(arrMap);
  expect(outputMap).toEqual(expectedArr);
  expect(deserializeObject(outputMap)).toEqual(arrMap);

  const arrStr = ['first', 'second', 'third', 'fourth'];
  const outputStr = await makeObjectSerializable(arrStr);
  expect(outputStr).toEqual(arrStr);
  expect(deserializeObject(outputStr)).toEqual(arrStr);
});

test('test serialize and deserializeObject function for non Object input', async () => {
  expect(await makeObjectSerializable('octopus')).toEqual('octopus');
  expect(deserializeObject(await makeObjectSerializable('octopus'))).toEqual(
    'octopus',
  );
  expect(await makeObjectSerializable(24567)).toEqual(24567);
  expect(deserializeObject(await makeObjectSerializable(24567))).toEqual(24567);
});

test('test makeObjectSerializable and deserializeObject function for Date input', async () => {
  const date = new Date(2021, 1, 29, 10, 31, 7, 205);
  expect(await makeObjectSerializable(date)).toMatchInlineSnapshot(`
    Object {
      "__flipper_object_type__": "Date",
      "data": "${date.toJSON()}",
    }
  `);
  expect(deserializeObject(await makeObjectSerializable(date))).toEqual(date);
});

test('test makeObjectSerializable and deserializeObject function for Map of Sets', async () => {
  const map = new Map([
    ['k1', new Set([1, 2, 3, 4, 5, 6])],
    [new Set([1, 2]), new Map([['k3', 'v3']])],
  ] as any);
  const expectedOutput = {
    __flipper_object_type__: 'Map',
    data: [
      ['k1', {__flipper_object_type__: 'Set', data: [1, 2, 3, 4, 5, 6]}],
      [
        {__flipper_object_type__: 'Set', data: [1, 2]},
        {__flipper_object_type__: 'Map', data: [['k3', 'v3']]},
      ],
    ],
  };
  expect(await makeObjectSerializable(map)).toEqual(expectedOutput);
  expect(deserializeObject(await makeObjectSerializable(map))).toEqual(map);
});

test('test makeObjectSerializable and deserializeObject function for Map, Dates and Set with complex nesting', async () => {
  const date1 = new Date('2019-02-15');
  const date2 = new Date('2019-02-16');
  const map = new Map([
    ['k1', date1],
    ['k2', new Set([date2])],
  ] as any);
  const expectedOutput = {
    __flipper_object_type__: 'Map',
    data: [
      ['k1', {__flipper_object_type__: 'Date', data: date1.toJSON()}],
      [
        'k2',
        {
          __flipper_object_type__: 'Set',
          data: [{__flipper_object_type__: 'Date', data: date2.toJSON()}],
        },
      ],
    ],
  };
  expect(await makeObjectSerializable(map)).toEqual(expectedOutput);
  expect(deserializeObject(await makeObjectSerializable(map))).toEqual(map);
});
