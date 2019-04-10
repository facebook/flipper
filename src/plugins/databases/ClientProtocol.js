/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {PluginClient} from '../../plugin';

type ClientCall<Params, Response> = Params => Promise<Response>;

type DatabaseListRequest = {};

type DatabaseListResponse = Array<{
  id: number,
  name: string,
  tables: Array<string>,
}>;

type QueryTableRequest = {
  databaseId: number,
  table: string,
  order?: string,
  reverse: boolean,
  start: number,
  count: number,
};

type QueryTableResponse = {
  columns: Array<string>,
  values: Array<Array<DatabaseValue>>,
  start: Number,
  count: Number,
  total: number,
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

type GetTableStructureRequest = {
  databaseId: Number,
  table: string,
};

type GetTableStructureResponse = {
  structureColumns: Array<string>,
  structureValues: Array<Array<DatabaseValue>>,
  indexesColumns: Array<string>,
  indexesValues: Array<Array<DatabaseValue>>,
  definition: string,
};

export class DatabaseClient {
  client: PluginClient;

  constructor(pluginClient: PluginClient) {
    this.client = pluginClient;
  }

  getDatabases: ClientCall<
    DatabaseListRequest,
    DatabaseListResponse,
  > = params => this.client.call('databaseList', {});

  getTableData: ClientCall<QueryTableRequest, QueryTableResponse> = params =>
    this.client.call('getTableData', params);

  getTableStructure: ClientCall<
    GetTableStructureRequest,
    GetTableStructureResponse,
  > = params => this.client.call('getTableStructure', params);
}
