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
import type {TableRows} from '../../ui/components/table/types';
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
  tableRows: TableRows,
  error: ?null,
|};

type Actions =
  | SelectDatabaseEvent
  | SelectDatabaseTableEvent
  | UpdateDatabasesEvent;

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

const ColumnSizes = {
  cpu_id: '10%',
  scaling_cur_freq: 'flex',
  scaling_min_freq: 'flex',
  scaling_max_freq: 'flex',
  cpuinfo_min_freq: 'flex',
  cpuinfo_max_freq: 'flex',
};

const Columns = {
  cpu_id: {
    value: 'CPU ID',
    resizable: true,
  },
  scaling_cur_freq: {
    value: 'Scaling Current',
    resizable: true,
  },
  scaling_min_freq: {
    value: 'Scaling MIN',
    resizable: true,
  },
  scaling_max_freq: {
    value: 'Scaling MAX',
    resizable: true,
  },
  cpuinfo_min_freq: {
    value: 'MIN Frequency',
    resizable: true,
  },
  cpuinfo_max_freq: {
    value: 'MAX Frequency',
    resizable: true,
  },
};

export default class extends FlipperPlugin<DatabasesPluginState, Actions> {
  databaseClient: DatabaseClient;

  state: DatabasesPluginState = {
    selectedDatabase: 0,
    selectedDatabaseTable: null,
    databases: [],
    viewMode: 'data',
    tableRows: [{columns: {cpu_id: {value: 5}}, key: '1'}],
    error: null,
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
          selectedDatabaseTable: databases[selectedDatabase].tables[0],
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
          selectedDatabaseTable: null,
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
    if (
      (previousState.selectedDatabase != newState.selectedDatabase ||
        previousState.selectedDatabaseTable !=
          newState.selectedDatabaseTable) &&
      newState.selectedDatabase &&
      newState.selectedDatabaseTable
    ) {
      this.databaseClient
        .getTableData({
          count: 10,
          databaseId: newState.selectedDatabase,
          reverse: false,
          table: newState.selectedDatabaseTable,
          start: 0,
        })
        .then(data => console.log(data))
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
        this.state.databases[this.state.selectedDatabase] &&
        this.state.databases[this.state.selectedDatabase].tables.reduce(
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
          <ManagedTable
            multiline={true}
            columnSizes={ColumnSizes}
            columns={Columns}
            autoHeight={true}
            floating={false}
            zebra={true}
            rows={this.state.tableRows}
          />
        </FlexRow>
        <Toolbar position="bottom" style={{paddingLeft: 8}}>
          <FlexRow grow={true}>
            <ButtonGroup>
              <Button onClick={this.onDataClicked}>Data</Button>
              <Button>Structure</Button>
            </ButtonGroup>
            <Text grow={true} style={{flex: 1, textAlign: 'center'}}>
              1-100 of 1056 row
            </Text>
            <ButtonNavigation
              canGoBack
              canGoForward
              onBack={() => {}}
              onForward={() => {}}
            />
          </FlexRow>
        </Toolbar>
      </FlexColumn>
    );
  }
}
