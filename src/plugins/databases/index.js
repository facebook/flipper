/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  styled,
  Toolbar,
  Select,
  FlexColumn,
  FlexRow,
  ManagedTable,
  Text,
  Button,
  ButtonGroup,
} from 'flipper';
import type {TableBodyRow} from '../../ui/components/table/types';
import {FlipperPlugin} from 'flipper';
import {DatabaseClient} from './ClientProtocol';
import {renderValue} from 'flipper';
import type {Value} from 'flipper';
import ButtonNavigation from './ButtonNavigation';

const PAGE_SIZE = 50;

const BoldSpan = styled('Span')({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});

type DatabasesPluginState = {|
  selectedDatabase: number,
  selectedDatabaseTable: ?string,
  pageRowNumber: number,
  databases: Array<DatabaseEntry>,
  viewMode: 'data' | 'structure',
  error: ?null,
  currentPage: ?Page,
  currentStructure: ?Structure,
|};

type Page = {
  databaseId: number,
  table: string,
  columns: Array<string>,
  rows: Array<TableBodyRow>,
  start: number,
  count: number,
  total: number,
};

type Structure = {|
  databaseId: number,
  table: string,
  columns: Array<string>,
  rows: Array<TableBodyRow>,
|};

type Actions =
  | SelectDatabaseEvent
  | SelectDatabaseTableEvent
  | UpdateDatabasesEvent
  | UpdateViewModeEvent
  | UpdatePageEvent
  | UpdateStructureEvent
  | NextPageEvent
  | PreviousPageEvent;

type DatabaseEntry = {
  id: number,
  name: string,
  tables: Array<string>,
};

type UpdateDatabasesEvent = {|
  databases: Array<{name: string, id: number, tables: Array<string>}>,
  type: 'UpdateDatabases',
|};

type SelectDatabaseEvent = {|
  type: 'UpdateSelectedDatabase',
  database: number,
|};

type SelectDatabaseTableEvent = {|
  type: 'UpdateSelectedDatabaseTable',
  table: string,
|};

type UpdateViewModeEvent = {|
  type: 'UpdateViewMode',
  viewMode: 'data' | 'structure',
|};

type UpdatePageEvent = {|
  type: 'UpdatePage',
  databaseId: number,
  table: string,
  columns: Array<string>,
  values: Array<Array<any>>,
  start: number,
  count: number,
  total: number,
|};

type UpdateStructureEvent = {|
  type: 'UpdateStructure',
  databaseId: number,
  table: string,
  columns: Array<string>,
  rows: Array<Array<any>>,
|};

type NextPageEvent = {
  type: 'NextPage',
};

type PreviousPageEvent = {
  type: 'PreviousPage',
};

function transformRow(
  columns: Array<string>,
  row: Array<Value>,
  index: number,
): TableBodyRow {
  const transformedColumns = {};
  for (var i = 0; i < columns.length; i++) {
    transformedColumns[columns[i]] = {value: renderValue(row[i])};
  }
  return {key: String(index), columns: transformedColumns};
}

export default class extends FlipperPlugin<DatabasesPluginState, Actions> {
  databaseClient: DatabaseClient;

  state: DatabasesPluginState = {
    selectedDatabase: 0,
    selectedDatabaseTable: null,
    pageRowNumber: 0,
    databases: [],
    viewMode: 'data',
    error: null,
    currentPage: null,
    currentStructure: null,
  };

  reducers = [
    [
      'UpdateDatabases',
      (
        state: DatabasesPluginState,
        results: UpdateDatabasesEvent,
      ): DatabasesPluginState => {
        const updates = results.databases;
        const databases = updates;
        const selectedDatabase =
          state.selectedDatabase || Object.values(databases)[0]
            ? // $FlowFixMe
              Object.values(databases)[0].id
            : 0;
        const selectedTable = databases[selectedDatabase - 1].tables[0];
        return {
          ...state,
          databases,
          selectedDatabase: selectedDatabase,
          selectedDatabaseTable: selectedTable,
          pageRowNumber: 0,
          currentPage:
            selectedDatabase === state.selectedDatabase &&
            selectedTable === state.selectedDatabaseTable
              ? state.currentPage
              : null,
          currentStructure: null,
        };
      },
    ],
    [
      'UpdateSelectedDatabase',
      (
        state: DatabasesPluginState,
        event: SelectDatabaseEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          selectedDatabase: event.database,
          selectedDatabaseTable:
            state.databases[event.database - 1].tables[0] || null,
          pageRowNumber: 0,
          currentPage: null,
          currentStructure: null,
        };
      },
    ],
    [
      'UpdateSelectedDatabaseTable',
      (
        state: DatabasesPluginState,
        event: SelectDatabaseTableEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          selectedDatabaseTable: event.table,
          pageRowNumber: 0,
          currentPage: null,
          currentStructure: null,
        };
      },
    ],
    [
      'UpdateViewMode',
      (
        state: DatabasesPluginState,
        event: UpdateViewModeEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          viewMode: event.viewMode,
        };
      },
    ],
    [
      'UpdatePage',
      (
        state: DatabasesPluginState,
        event: UpdatePageEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          currentPage: {
            rows: event.values.map((row: Array<Value>, index: number) =>
              transformRow(event.columns, row, index),
            ),
            ...event,
          },
        };
      },
    ],
    [
      'UpdateStructure',
      (
        state: DatabasesPluginState,
        event: UpdateStructureEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          currentStructure: {
            databaseId: event.databaseId,
            table: event.table,
            columns: event.columns,
            rows: event.rows.map((row: Array<Value>, index: number) =>
              transformRow(event.columns, row, index),
            ),
          },
        };
      },
    ],
    [
      'NextPage',
      (
        state: DatabasesPluginState,
        event: UpdatePageEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          pageRowNumber: state.pageRowNumber + PAGE_SIZE,
          currentPage: null,
        };
      },
    ],
    [
      'PreviousPage',
      (
        state: DatabasesPluginState,
        event: UpdatePageEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          pageRowNumber: Math.max(state.pageRowNumber - PAGE_SIZE, 0),
          currentPage: null,
        };
      },
    ],
    [
      'UpdateViewMode',
      (
        state: DatabasesPluginState,
        event: UpdateViewModeEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          viewMode: event.viewMode,
        };
      },
    ],
  ].reduce((acc, val) => {
    const name = val[0];
    const f = val[1];

    acc[name] = (previousState, event) => {
      const newState = f(previousState, event);
      this.onStateChanged(previousState, newState);
      return newState;
    };
    return acc;
  }, {});

  onStateChanged(
    previousState: DatabasesPluginState,
    newState: DatabasesPluginState,
  ) {
    const databaseId = newState.selectedDatabase;
    const table = newState.selectedDatabaseTable;
    if (
      newState.viewMode === 'data' &&
      newState.currentPage === null &&
      databaseId &&
      table
    ) {
      this.databaseClient
        .getTableData({
          count: PAGE_SIZE,
          databaseId: newState.selectedDatabase,
          reverse: false,
          table: table,
          start: newState.pageRowNumber,
        })
        .then(data => {
          console.log(data);
          this.dispatchAction({
            type: 'UpdatePage',
            databaseId: databaseId,
            table: table,
            columns: data.columns,
            values: data.values,
            start: data.start,
            count: data.count,
            total: data.total,
          });
        })
        .catch(e => {
          this.setState({error: e});
        });
    }
    if (
      newState.viewMode === 'structure' &&
      newState.currentStructure === null &&
      databaseId &&
      table
    ) {
      this.databaseClient
        .getTableStructure({
          databaseId: databaseId,
          table: table,
        })
        .then(data => {
          console.log(data);
          this.dispatchAction({
            type: 'UpdateStructure',
            databaseId: databaseId,
            table: table,
            columns: data.structureColumns,
            rows: data.structureValues,
          });
        })
        .catch(e => {
          this.setState({error: e});
        });
    }
  }

  init() {
    this.databaseClient = new DatabaseClient(this.client);
    this.databaseClient.getDatabases({}).then(databases => {
      console.log(databases);
      this.dispatchAction({
        type: 'UpdateDatabases',
        databases,
      });
    });
  }

  onDataClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'data'});
  };

  onStructureClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'structure'});
  };

  onDatabaseSelected = (selected: string) => {
    const dbId = this.state.databases.find(x => x.name === selected)?.id || 0;
    this.dispatchAction({
      database: dbId,
      type: 'UpdateSelectedDatabase',
    });
  };

  onDatabaseTableSelected = (selected: string) => {
    this.dispatchAction({
      table: selected,
      type: 'UpdateSelectedDatabaseTable',
    });
  };

  onNextPageClicked = () => {
    this.dispatchAction({type: 'NextPage'});
  };

  onPreviousPageClicked = () => {
    this.dispatchAction({type: 'PreviousPage'});
  };

  renderTable() {
    if (!this.state.currentPage) {
      return null;
    }
    return (
      <ManagedTable
        floating={false}
        columnOrder={this.state.currentPage.columns.map(name => ({
          key: name,
          visible: true,
        }))}
        columns={
          this.state.currentPage &&
          this.state.currentPage.columns.reduce((acc, val) => {
            acc[val] = {value: val, resizable: true};
            return acc;
          }, {})
        }
        zebra={true}
        rows={this.state.currentPage?.rows || []}
      />
    );
  }

  renderStructure() {
    if (!this.state.currentStructure) {
      return null;
    }
    return (
      <ManagedTable
        floating={false}
        columnOrder={this.state.currentStructure.columns.map(name => ({
          key: name,
          visible: true,
        }))}
        columns={
          this.state.currentStructure &&
          this.state.currentStructure.columns.reduce((acc, val) => {
            acc[val] = {value: val, resizable: true};
            return acc;
          }, {})
        }
        zebra={true}
        rows={
          (this.state.currentStructure && this.state.currentStructure.rows) ||
          []
        }
      />
    );
  }

  render() {
    const tableOptions =
      (this.state.selectedDatabase &&
        this.state.databases[this.state.selectedDatabase - 1] &&
        this.state.databases[this.state.selectedDatabase - 1].tables.reduce(
          (options, tableName) => ({...options, [tableName]: tableName}),
          {},
        )) ||
      {};

    return (
      <FlexColumn style={{flex: 1}}>
        <Toolbar position="top" style={{paddingLeft: 8}}>
          <BoldSpan style={{marginRight: 16}}>Database</BoldSpan>
          <Select
            options={this.state.databases
              .map(x => x.name)
              .reduce((obj, item) => {
                obj[item] = item;
                return obj;
              }, {})}
            selected={String(this.state.selectedDatabase)}
            onChange={this.onDatabaseSelected}
          />
          <BoldSpan style={{marginLeft: 16, marginRight: 16}}>Table</BoldSpan>
          <Select
            options={tableOptions}
            selected={this.state.selectedDatabaseTable}
            onChange={this.onDatabaseTableSelected}
          />
          <div grow={true} />
          <Button
            style={{marginLeft: 'auto', display: 'none'}}
            onClick={this.onDataClicked}>
            Execute SQL
          </Button>
        </Toolbar>
        <FlexRow style={{flex: 1}}>
          {this.state.viewMode === 'data'
            ? this.renderTable()
            : this.renderStructure()}
        </FlexRow>
        <Toolbar position="bottom" style={{paddingLeft: 8}}>
          <FlexRow grow={true}>
            <ButtonGroup>
              <Button onClick={this.onDataClicked}>Data</Button>
              <Button onClick={this.onStructureClicked}>Structure</Button>
            </ButtonGroup>
            {this.state.currentPage ? (
              <Text grow={true} style={{flex: 1, textAlign: 'center'}}>
                {this.state.currentPage.count === this.state.currentPage.total
                  ? `${this.state.currentPage.count} `
                  : `${this.state.currentPage.start + 1}-${this.state
                      .currentPage.start + this.state.currentPage.count} `}
                of {this.state.currentPage.total} rows
              </Text>
            ) : null}
            {this.state.currentPage ? (
              <ButtonNavigation
                canGoBack={this.state.currentPage.start > 0}
                canGoForward={
                  this.state.currentPage.start + this.state.currentPage.count <
                  this.state.currentPage.total
                }
                onBack={this.onPreviousPageClicked}
                onForward={this.onNextPageClicked}
              />
            ) : null}
          </FlexRow>
        </Toolbar>
        {this.state.error?.toString()}
      </FlexColumn>
    );
  }
}
