/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type DatabaseListRequest = {
  method: 'getDatabases',
  params: {},
};

export type DatabaseListResponse = {
  databases: Array<{name: String, tables: Array<string>}>,
};

export type QueryTableRequest = {
  method: 'queryTable',
  params: {
    table: string,
  },
};

export type QueryTableResponse = {
  columns: Array<string>,
  vlaues: Array<Array<DatabaseValue>>,
};

type DatabaseValue =
  | {
      type: 'string',
      value: string,
    }
  | {
      type: 'integer',
      value: number,
    }
  | {
      type: 'float',
      value: number,
    };
