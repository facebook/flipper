/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Value} from 'flipper';
import {
  isUpdatable,
  convertStringToValue,
  constructQueryClause,
  constructUpdateQuery,
} from '../UpdateQueryUtil';

const dbColumnMeta: Array<string> = [
  'column_name',
  'data_type',
  'nullable',
  'default',
  'primary_key',
  'foreign_key',
];
// this is copied from table db1_first_table from db database1.db
const db1FirstTableColumnData: Array<Array<Value>> = [
  [
    {value: '_id', type: 'string'},
    {value: 'INTEGER', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col0_text', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col1_integer', type: 'string'},
    {value: 'INTEGER', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col2_float', type: 'string'},
    {value: 'FLOAT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col3_blob', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col4_null', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {value: 'NULL', type: 'string'},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col5', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col6', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col7', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col8', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
  [
    {value: 'db1_col9', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
];
// this is copied from table android_metadata from db database1.db
const androidMetadataColumnData: Array<Array<Value>> = [
  [
    {value: 'locale', type: 'string'},
    {value: 'TEXT', type: 'string'},
    {value: true, type: 'boolean'},
    {type: 'null', value: null},
    {value: false, type: 'boolean'},
    {type: 'null', value: null},
  ],
];

test('convertStringToValue', () => {
  const allTypes: {[key: string]: {type: string; nullable: boolean}} = {
    nullableString: {type: 'STRING', nullable: true},
    nonNullString: {type: 'STRING', nullable: false},
    nullableInteger: {type: 'INTEGER', nullable: true},
    nonNullInteger: {type: 'INTEGER', nullable: false},
    nullableBlob: {type: 'BLOB', nullable: true},
    nonNullBlob: {type: 'BLOB', nullable: false},
    nullableReal: {type: 'REAL', nullable: true},
    nonNullReal: {type: 'REAL', nullable: false},
  };

  const testcases: Array<{
    input: {key: string; value: string};
    output: Value;
  }> = [
    {
      input: {key: 'nullableString', value: 'this is a string'},
      output: {type: 'string', value: 'this is a string'},
    },
    {
      input: {key: 'nullableString', value: ''},
      output: {type: 'null', value: null},
    },
    {
      input: {key: 'nonNullString', value: 'this is a string'},
      output: {type: 'string', value: 'this is a string'},
    },
    {
      input: {key: 'nonNullString', value: ''},
      output: {type: 'string', value: ''},
    },
    {
      input: {key: 'nullableInteger', value: '1337'},
      output: {type: 'integer', value: 1337},
    },
    {
      input: {key: 'nullableInteger', value: ''},
      output: {type: 'null', value: null},
    },
    {
      input: {key: 'nonNullInteger', value: '1337'},
      output: {type: 'integer', value: 1337},
    },
    {
      input: {key: 'nonNullInteger', value: ''},
      output: {type: 'integer', value: 0},
    },
    {
      input: {key: 'nullableBlob', value: 'this is a blob'},
      output: {type: 'blob', value: 'this is a blob'},
    },
    {
      input: {key: 'nullableBlob', value: ''},
      output: {type: 'null', value: null},
    },
    {
      input: {key: 'nonNullBlob', value: 'this is a blob'},
      output: {type: 'blob', value: 'this is a blob'},
    },
    {
      input: {key: 'nonNullBlob', value: ''},
      output: {type: 'blob', value: ''},
    },
    {
      input: {key: 'nullableReal', value: '13.37'},
      output: {type: 'float', value: 13.37},
    },
    {
      input: {key: 'nullableReal', value: ''},
      output: {type: 'null', value: null},
    },
    {
      input: {key: 'nonNullReal', value: '13.37'},
      output: {type: 'float', value: 13.37},
    },
    {
      input: {key: 'nonNullReal', value: ''},
      output: {type: 'float', value: 0},
    },
    {
      input: {key: 'nonExistingType', value: 'this has no type'},
      output: {type: 'string', value: 'this has no type'},
    },
    {
      input: {key: 'nonExistingType', value: ''},
      output: {type: 'null', value: null},
    },
  ];

  for (const testcase of testcases) {
    expect(
      convertStringToValue(allTypes, testcase.input.key, testcase.input.value),
    ).toEqual(testcase.output);
  }
});

test('constructQueryClause with no value given', () => {
  expect(constructQueryClause({}, 'connecter')).toEqual('');
});

test('constructQueryClause with exactly one string value', () => {
  expect(
    constructQueryClause(
      {key1: {type: 'string', value: 'this is a string'}},
      'connecter',
    ),
  ).toEqual(`\`key1\`='this is a string'`);
});

test('constructQueryClause with exactly one integer value', () => {
  expect(
    constructQueryClause({key1: {type: 'integer', value: 1337}}, 'connecter'),
  ).toEqual(`\`key1\`=1337`);
});

test('constructQueryClause with exactly one null value', () => {
  expect(
    constructQueryClause({key1: {type: 'null', value: null}}, 'connecter'),
  ).toEqual(`\`key1\`=NULL`);
});

test("constructQueryClause with special character (single quote ('))", () => {
  expect(
    constructQueryClause(
      {key1: {type: 'string', value: "this is a 'single quote'"}},
      'connecter',
    ),
  ).toEqual(`\`key1\`='this is a ''single quote'''`);
});

test('constructQueryClause with multiple value', () => {
  const values: {[key: string]: Value} = {
    key1: {type: 'string', value: 'this is a string'},
    key2: {type: 'null', value: null},
    key3: {type: 'float', value: 13.37},
  };

  expect(constructQueryClause(values, 'connector')).toEqual(
    `\`key1\`='this is a string' connector \`key2\`=NULL connector \`key3\`=13.37`,
  );
});

test('constructQueryClause with multiple value with single quotes mixed in string', () => {
  const values: {[key: string]: Value} = {
    key1: {type: 'string', value: `this is 'a' string`},
    key2: {type: 'null', value: null},
    key3: {type: 'float', value: 13.37},
    key4: {type: 'string', value: `there are single quotes 'here' and 'there'`},
  };

  expect(constructQueryClause(values, 'connector')).toEqual(
    `\`key1\`='this is ''a'' string' connector \`key2\`=NULL connector \`key3\`=13.37 connector \`key4\`='there are single quotes ''here'' and ''there'''`,
  );
});

test('constructUpdateQuery', () => {
  const setClause: {[key: string]: Value} = {
    key1: {type: 'string', value: 'this is a string'},
    key2: {type: 'null', value: null},
    key3: {type: 'float', value: 13.37},
  };
  const whereClause: {[key: string]: Value} = {
    key4: {type: 'number', value: 13371337},
  };
  expect(constructUpdateQuery('table_name', whereClause, setClause)).toEqual(
    `UPDATE \`table_name\`
    SET \`key1\`='this is a string' , \`key2\`=NULL , \`key3\`=13.37
    WHERE \`key4\`=13371337`,
  );
});

test('isUpdatable with straightforward test with some are true', () => {
  const columnMeta = ['primary_key'];
  const columnData: Array<Array<Value>> = [
    [{type: 'boolean', value: true}],
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
  ];
  expect(isUpdatable(columnMeta, columnData)).toBe(true);
});

test('isUpdatable with straightforward test with all are false', () => {
  const columnMeta = ['primary_key'];
  const columnData: Array<Array<Value>> = [
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
    [{type: 'boolean', value: false}],
  ];
  expect(isUpdatable(columnMeta, columnData)).toBe(false);
});

test('isUpdate with regular use case with some are true', () => {
  const columnMeta = dbColumnMeta;
  const columnData: Array<Array<Value>> = db1FirstTableColumnData;
  expect(isUpdatable(columnMeta, columnData)).toBe(true);
});

test('isUpdate with regular use case with all are false', () => {
  const columnMeta = dbColumnMeta;
  const columnData: Array<Array<Value>> = androidMetadataColumnData;
  expect(isUpdatable(columnMeta, columnData)).toBe(false);
});
