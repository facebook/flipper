/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Value} from './TypeBasedValueRenderer';

type DatabaseListRequest = {};

type DatabaseListResponse = Array<{
  id: number;
  name: string;
  tables: Array<string>;
}>;

type QueryTableRequest = {
  databaseId: number;
  table: string;
  order?: string;
  reverse: boolean;
  start: number;
  count: number;
};

type QueryTableResponse = {
  columns: Array<string>;
  values: Array<Array<Value>>;
  start: number;
  count: number;
  total: number;
};

type GetTableStructureRequest = {
  databaseId: number;
  table: string;
};

type GetTableStructureResponse = {
  structureColumns: Array<string>;
  structureValues: Array<Array<Value>>;
  indexesColumns: Array<string>;
  indexesValues: Array<Array<Value>>;
  definition: string;
};

type ExecuteSqlRequest = {
  databaseId: number;
  value: string;
};

type ExecuteSqlResponse = {
  type: string;
  columns: Array<string>;
  values: Array<Array<Value>>;
  insertedId: number;
  affectedCount: number;
};

type GetTableInfoRequest = {
  databaseId: number;
  table: string;
};

type GetTableInfoResponse = {
  definition: string;
};

export type Methods = {
  databaseList(params: DatabaseListRequest): Promise<DatabaseListResponse>;
  getTableData(params: QueryTableRequest): Promise<QueryTableResponse>;
  getTableStructure(
    params: GetTableStructureRequest,
  ): Promise<GetTableStructureResponse>;
  execute(params: ExecuteSqlRequest): Promise<ExecuteSqlResponse>;
  getTableInfo(params: GetTableInfoRequest): Promise<GetTableInfoResponse>;
};

export type Events = {};
