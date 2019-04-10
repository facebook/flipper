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
import ButtonNavigation from './ButtonNavigation';

const BoldSpan = styled('Span')({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});

type DatabasesPluginState = {|
  selectedDatabase: number,
  selectedDatabaseTable: ?string,
  databases: Array<DatabaseEntry>,
  viewMode: 'data' | 'structure',
  error: ?null,
  currentPage: ?Page,
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

type Actions =
  | SelectDatabaseEvent
  | SelectDatabaseTableEvent
  | UpdateDatabasesEvent
  | UpdatePageEvent;

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

function transformRow(
  columns: Array<string>,
  row: Array<any>,
  index: number,
): TableBodyRow {
  const transformedColumns = {};
  for (var i = 0; i < columns.length; i++) {
    transformedColumns[columns[i]] = {value: row[i].value};
  }
  return {key: String(index), columns: transformedColumns};
}

export default class extends FlipperPlugin<DatabasesPluginState, Actions> {
  databaseClient: DatabaseClient;

  state: DatabasesPluginState = {
    selectedDatabase: 0,
    selectedDatabaseTable: null,
    databases: [],
    viewMode: 'data',
    error: null,
    currentPage: null,
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
        return {
          ...state,
          databases,
          selectedDatabase: selectedDatabase,
          selectedDatabaseTable: databases[selectedDatabase - 1].tables[0],
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
        const rows: Array<TableBodyRow> = event.values.map(
          (row: Array<any>, index: number) =>
            transformRow(event.columns, row, index),
        );
        return {
          ...state,
          currentPage: {
            rows: rows,
            ...event,
          },
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
      (previousState.selectedDatabase != newState.selectedDatabase ||
        previousState.selectedDatabaseTable !=
          newState.selectedDatabaseTable) &&
      databaseId &&
      table
    ) {
      this.databaseClient
        .getTableData({
          count: 30,
          databaseId: newState.selectedDatabase,
          reverse: false,
          table: table,
          start: 0,
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

  onDataClicked = () => {};

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
            value={this.state.selectedDatabase}
            onChange={this.onDatabaseSelected}
          />
          <BoldSpan style={{marginLeft: 16, marginRight: 16}}>Table</BoldSpan>
          <Select
            options={tableOptions}
            value={this.state.selectedDatabaseTable}
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
          {this.state.currentPage &&
          this.state.currentPage.databaseId === this.state.selectedDatabase &&
          this.state.currentPage.table === this.state.selectedDatabaseTable ? (
            <ManagedTable
              multiline={true}
              columns={this.state.currentPage.columns.reduce((acc, val) => {
                acc[val] = {value: val, resizable: true};
                return acc;
              }, {})}
              autoHeight={true}
              floating={false}
              zebra={true}
              rows={this.state.currentPage?.rows}
            />
          ) : null}
        </FlexRow>
        <Toolbar position="bottom" style={{paddingLeft: 8}}>
          <FlexRow grow={true}>
            <ButtonGroup>
              <Button onClick={this.onDataClicked}>Data</Button>
              <Button>Structure</Button>
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
            <ButtonNavigation
              canGoBack
              canGoForward
              onBack={() => {}}
              onForward={() => {}}
            />
          </FlexRow>
        </Toolbar>
        {this.state.error}
      </FlexColumn>
    );
  }
}
