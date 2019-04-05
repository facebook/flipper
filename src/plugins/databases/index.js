/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  styled,
  colors,
  Heading,
  Toolbar,
  Select,
  FlexColumn,
  FlexRow,
  ManagedTable,
  Text,
  Button,
  ButtonGroup,
} from 'flipper';
import {FlipperPlugin} from 'flipper';
import ButtonNavigation from './ButtonNavigation';

const BoldSpan = styled('Span')({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});

type DatabasesPluginState = {|
  selectedDatabase: ?string,
  selectedDatabaseTable: ?string,
  databases: DatabaseMap,
|};

type DatabaseMap = {[databaseName: string]: DatabaseEntry};

type DatabaseEntry = {
  tables: Array<string>,
};

type DatabaseListMessage = {|
  databases: {[name: string]: {tables: Array<string>}},
|};

type SelectDatabaseEvent = {|
  type: 'UpdateSelectedDatabase',
  database: string,
|};

type SelectDatabaseTableEvent = {|
  type: 'UpdateSelectedDatabaseTable',
  table: string,
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

export default class extends FlipperPlugin<DatabasesPluginState> {
  state: DatabasesPluginState = {
    selectedDatabase: null,
    selectedDatabaseTable: null,
    databases: {},
  };

  reducers = {
    UpdateDatabases(
      state: DatabasesPluginState,
      results: DatabaseListMessage,
    ): DatabasesPluginState {
      const updates = results.databases;
      const databases = {...state.databases, ...updates};
      const selectedDatabase =
        state.selectedDatabase || Object.keys(databases)[0];
      return {
        ...state,
        databases,
        selectedDatabase: selectedDatabase,
        selectedDatabaseTable: databases[selectedDatabase].tables[0],
      };
    },
    UpdateSelectedDatabase(
      state: DatabasesPluginState,
      event: SelectDatabaseEvent,
    ): DatabasesPluginState {
      return {
        selectedDatabase: event.database,
        selectedDatabaseTable: null,
        databases: state.databases,
      };
    },
  };

  init() {
    this.dispatchAction({
      databases: {
        db1: {database: null, tables: ['A', 'B']},
        db2: {database: null, tables: ['E', 'F']},
        db3: {database: null, tables: ['C', 'D']},
      },
      type: 'UpdateDatabases',
    });

    setTimeout(() => {
      this.dispatchAction({
        databases: {
          db4: {database: null, tables: ['A', 'B']},
          db5: {database: null, tables: ['E', 'F']},
          db6: {database: null, tables: ['C', 'D']},
        },
        type: 'UpdateDatabases',
      });
    }, 100);
  }

  onDataClicked = () => {};

  onDatabaseSelected = (selected: string) => {
    const action: SelectDatabaseEvent = {
      database: selected,
      type: 'UpdateSelectedDatabase',
    };
    this.dispatchAction(action);
  };

  onDatabaseTableSelected = (selected: string) => {
    const action: SelectDatabaseTableEvent = {
      table: selected,
      type: 'UpdateSelectedDatabaseTable',
    };
    this.dispatchAction(action);
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
            options={Object.keys(this.state.databases).reduce((obj, item) => {
              obj[item] = item;
              return obj;
            }, {})}
            selected={this.state.selectedDatabase}
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
          <ManagedTable
            multiline={true}
            columnSizes={ColumnSizes}
            columns={Columns}
            autoHeight={true}
            floating={false}
            zebra={true}
            rows={[]}
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
