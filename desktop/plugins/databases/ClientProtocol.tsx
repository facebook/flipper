/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, Value} from 'flipper';

type ClientCall<Params, Response> = (arg: Params) => Promise<Response>;

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

export class DatabaseClient {
  client: PluginClient;

  constructor(pluginClient: PluginClient) {
    this.client = pluginClient;
  }

  getDatabases: ClientCall<DatabaseListRequest, DatabaseListResponse> = () =>
    this.client.call('databaseList', {});

  getTableData: ClientCall<QueryTableRequest, QueryTableResponse> = (params) =>
    this.client.call('getTableData', params);

  getTableStructure: ClientCall<
    GetTableStructureRequest,
    GetTableStructureResponse
  > = (params) => this.client.call('getTableStructure', params);

  getExecution: ClientCall<ExecuteSqlRequest, ExecuteSqlResponse> = (params) =>
    this.client.call('execute', params);

  getTableInfo: ClientCall<GetTableInfoRequest, GetTableInfoResponse> = (
    params,
  ) => this.client.call('getTableInfo', params);
}
