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
  ButtonGroup
} from 'flipper';
import { FlipperPlugin } from 'flipper';
import ButtonNavigation from './ButtonNavigation';

const BoldSpan = styled('Span')({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});

export type Database = {|
  [name: string]: any,
|};

type DatabaseEntry = {
  database: Database,
  databaseTableList: Array<string>,
};

type DatabaseMap = {
  [name: string]: DatabaseEntry,
};

type DatabasesPluginState = {|
  selectedDatabase: ?string,
    selectedDatabaseTable: ?string,
      databaseList: DatabaseMap,
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

  state = {
    selectedDatabase: null,
    selectedDatabaseTable: null,
    databaseList: {},
  };

  reducers = {
    UpdateDatabases(state: DatabasesPluginState, results: Object) {
      let update = results.update;
      let entry = state.databaseList[update.name] || {};
      entry.database = update.database;
      entry.databaseTableList = update.databaseTableList || [];
      state.databaseList[update.name] = entry;
      return {
        selectedDatabase: state.selectedDatabase || update.name,
        selectedDatabaseTable: null,
        databaseList: state.databaseList,
      };
    },
    UpdateSelectedDatabase(state: SharedPreferencesState, event: Object) {
      return {
        selectedDatabase: event.selected,
        selectedDatabaseTable: null,
        databaseList: state.databaseList,
      };
    },
  };

  init() {
    this.state.selectedDatabase = "name";

    this.dispatchAction({
      update: { name: "name", database: null, databaseTableList: ["A", "B"]},
      type: 'UpdateDatabases'
    });
    this.dispatchAction({
      update: { name: "name3", database: null, databaseTableList: ["E", "F"] },
      type: 'UpdateDatabases'
    });
    this.dispatchAction({
      update: { name: "name2", database: null, databaseTableList: ["C", "D"] },
      type: 'UpdateDatabases'
    });
  }

  onDataClicked = () => {

  }

  onDatabaseSelected = (selected: string) => {
    this.setState({selectedDatabase:selected})
    this.dispatchAction({
      selected: selected,
      type: 'UpdateSelectedDatabase'
    });
  };

  onDatabaseTableSelected = (selected: string) => {
    this.dispatchAction({
      selected: selected,
      type: 'UpdateSelectedDatabaseTable'
    });
  };

  render() {
    return (
      <FlexColumn style={{ flex: 1 }}>
        <Toolbar position="top" style={{ paddingLeft: 8 }}>
          <BoldSpan style={{ marginRight: 16 }}>Database</BoldSpan>
          <Select
            options={Object.keys(this.state.databaseList).reduce(
              (obj, item) => {
                obj[item] = item;
                return obj;
              },
              {},
            )}
            onChange={this.onDatabaseSelected}
          />
          <BoldSpan style={{ marginLeft: 16, marginRight: 16 }}>Table</BoldSpan>
          <Select
            options={this.state.selectedDatabase == null ? {} : this.state.databaseList[this.state.selectedDatabase].databaseTableList}
            selected={this.state.selectedDatabase == null ? {} : this.state.databaseList[this.state.selectedDatabase].databaseTableList[1]}
            onChange={this.onDatabaseTableSelected}
          />
        </Toolbar>
        <FlexRow style={{ flex: 1 }}>
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
        <Toolbar position="bottom" style={{ paddingLeft: 8 }}>
          <FlexRow grow={true}>
            <ButtonGroup>
              <Button onClick={this.onDataClicked}>Data</Button>
              <Button>Structure</Button>
            </ButtonGroup>
            <Text grow={true} style={{ flex: 1, textAlign: 'center' }}>1-100 of 1056 row</Text>
            <ButtonNavigation canGoBack canGoForward />
          </FlexRow>
        </Toolbar>
      </FlexColumn>
    );
  }
}