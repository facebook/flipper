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
  Input,
} from 'flipper';
import {Component} from 'react';
import type {
  TableBodyRow,
  TableColumnSizes,
  TableRowSortOrder,
} from '../../ui/components/table/types';
import {FlipperPlugin} from 'flipper';
import {DatabaseClient} from './ClientProtocol';
import {renderValue} from 'flipper';
import type {Value} from 'flipper';
import ButtonNavigation from './ButtonNavigation';
import _ from 'lodash';

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
  columnSizes: {
    [database: number]: {
      [table: string]: TableColumnSizes,
    },
  },
  currentSort: ?TableRowSortOrder,
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
  indexesColumns: Array<string>,
  indexesValues: Array<TableBodyRow>,
|};

type Actions =
  | SelectDatabaseEvent
  | SelectDatabaseTableEvent
  | UpdateDatabasesEvent
  | UpdateViewModeEvent
  | UpdatePageEvent
  | UpdateStructureEvent
  | NextPageEvent
  | PreviousPageEvent
  | ColumnResizeEvent
  | RefreshEvent
  | SortByChangedEvent
  | GoToRowEvent;

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
  indexesColumns: Array<string>,
  indexesValues: Array<Array<any>>,
|};

type NextPageEvent = {
  type: 'NextPage',
};

type PreviousPageEvent = {
  type: 'PreviousPage',
};

type ColumnResizeEvent = {
  type: 'ColumnResize',
  view: 'page',
  database: number,
  table: string,
  sizes: TableColumnSizes,
};

type RefreshEvent = {
  type: 'Refresh',
};

type SortByChangedEvent = {
  type: 'SortByChanged',
  sortOrder: TableRowSortOrder,
};

type GoToRowEvent = {
  type: 'GoToRow',
  row: number,
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

function renderTable(page: ?Page, component: DatabasesPlugin) {
  if (!page) {
    return null;
  }
  return (
    <ManagedTable
      tableKey={`databases-${page.databaseId}-${page.table}`}
      floating={false}
      columnOrder={page.columns.map(name => ({
        key: name,
        visible: true,
      }))}
      columns={page.columns.reduce((acc, val) => {
        acc[val] = {value: val, resizable: true, sortable: true};
        return acc;
      }, {})}
      zebra={true}
      rows={page.rows}
      horizontallyScrollable={true}
      onColumnResize={sizes => {
        if (page) {
          component.dispatchAction({
            type: 'ColumnResize',
            view: 'page',
            database: page.databaseId,
            table: page.table,
            sizes: sizes,
          });
        }
      }}
      onSort={(sortOrder: TableRowSortOrder) => {
        component.dispatchAction({
          type: 'SortByChanged',
          sortOrder,
        });
      }}
      initialSortOrder={component.state.currentSort}
    />
  );
}

function renderDatabaseColumns(structure: ?Structure) {
  if (!structure) {
    return null;
  }
  return (
    <FlexRow grow={true}>
      <ManagedTable
        floating={false}
        columnOrder={structure.columns.map(name => ({
          key: name,
          visible: true,
        }))}
        columns={structure.columns.reduce((acc, val) => {
          acc[val] = {value: val, resizable: true};
          return acc;
        }, {})}
        zebra={true}
        rows={structure.rows || []}
        horizontallyScrollable={true}
      />
    </FlexRow>
  );
}

function renderDatabaseIndexes(structure: ?Structure) {
  if (!structure) {
    return null;
  }
  return (
    <FlexRow grow={true}>
      <ManagedTable
        floating={false}
        columnOrder={structure.indexesColumns.map(name => ({
          key: name,
          visible: true,
        }))}
        columns={structure.indexesColumns.reduce((acc, val) => {
          acc[val] = {value: val, resizable: true};
          return acc;
        }, {})}
        zebra={true}
        rows={structure.indexesValues || []}
        horizontallyScrollable={true}
      />
    </FlexRow>
  );
}

type PageInfoProps = {
  currentRow: number,
  count: number,
  totalRows: number,
  onChange: (currentRow: number, count: number) => void,
};

class PageInfo extends Component<PageInfoProps, {isOpen: boolean, inputValue: string}> {

constructor(props: PageInfoProps) {
  super(props);
  this.state = {isOpen: false, inputValue: String(props.currentRow)};
}

  onOpen() {
    this.setState({isOpen: true});
  }

  onInputChanged(e) {
    this.setState({inputValue: e.target.value});
  }

  onSubmit(e: SyntheticKeyboardEvent<>) {
    if (e.key === 'Enter') {
      const rowNumber = parseInt(this.state.inputValue);
      console.log(rowNumber);
      this.props.onChange(rowNumber - 1, this.props.count);
      this.setState({isOpen: false});
    }
  }

  render() {
    return (
      <FlexRow grow={true} alignItems={'center'}>
        <div style={{flex: 1}}/>
        <Text>
          {this.props.count === this.props.totalRows
            ? `${this.props.count} `
            : `${this.props.currentRow + 1}-${this.props.currentRow + this.props.count} `}
          of {this.props.totalRows} rows
        </Text>
        <div style={{flex: 1}}/>
        {this.state.isOpen ?
          <Input tabIndex={1} placeholder={this.props.currentRow+1} onChange={this.onInputChanged.bind(this)} onKeyDown={this.onSubmit.bind(this)}/> :
          <Button style={{textAlign: 'center'}} onClick={this.onOpen.bind(this)}>
                    Go To Row
          </Button>
        }
      </FlexRow>);
  }
}

export default class DatabasesPlugin extends FlipperPlugin<
  DatabasesPluginState,
  Actions,
> {
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
    columnSizes: {},
    currentSort: null,
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
        const sameTableSelected =
          selectedDatabase === state.selectedDatabase &&
          selectedTable === state.selectedDatabaseTable;
        return {
          ...state,
          databases,
          selectedDatabase: selectedDatabase,
          selectedDatabaseTable: selectedTable,
          pageRowNumber: 0,
          currentPage: sameTableSelected ? state.currentPage : null,
          currentStructure: null,
          currentSort: sameTableSelected ? state.currentSort : null,
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
          currentSort: null,
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
          currentSort: null,
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
            indexesColumns: event.indexesColumns,
            indexesValues: event.indexesValues.map(
              (row: Array<Value>, index: number) =>
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
      'GoToRow',
      (
        state: DatabasesPluginState,
        event: GoToRowEvent,
      ): DatabasesPluginState => {
        if (!state.currentPage) {
          return state;
        }
        const destinationRow = event.row < 0 ? 0 :
          event.row >= state.currentPage.total - PAGE_SIZE ? Math.max(state.currentPage.total - PAGE_SIZE, 0) : event.row;
        return {
          ...state,
          pageRowNumber: destinationRow,
          currentPage: null,
        };
      },
    ],
    [
      'Refresh',
      (
        state: DatabasesPluginState,
        event: RefreshEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
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
    [
      'ColumnResize',
      (state: DatabasesPluginState, event: ColumnResizeEvent) => {
        return {
          ...state,
          columnSizes: {
            ...state.columnSizes,
            [event.database]: {
              ...state.columnSizes[event.database],
              [event.table]: event.sizes,
            },
          },
        };
      },
    ],
    [
      'SortByChanged',
      (state: DatabasesPluginState, event: SortByChangedEvent) => {
        return {
          ...state,
          currentSort: event.sortOrder,
          pageRowNumber: 0,
          currentPage: null,
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
          order: newState.currentSort?.key,
          reverse: (newState.currentSort?.direction || 'up') === 'down',
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
            indexesColumns: data.indexesColumns,
            indexesValues: data.indexesValues,
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

  onRefreshClicked = () => {
    this.dispatchAction({type: 'Refresh'});
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

  onGoToRow = (row: number, count: number) => {
    this.dispatchAction({type: 'GoToRow', row: row});
  };

  renderStructure() {
    return [
      renderDatabaseColumns(this.state.currentStructure),
      renderDatabaseIndexes(this.state.currentStructure),
    ];
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
          <Button onClick={this.onRefreshClicked}>Refresh</Button>
          <Button style={{marginLeft: 'auto', display: 'none'}}>
            Execute SQL
          </Button>
        </Toolbar>
        <FlexColumn grow={true}>
          {this.state.viewMode === 'data'
            ? renderTable(this.state.currentPage, this)
            : this.renderStructure()}
        </FlexColumn>
        <Toolbar position="bottom" style={{paddingLeft: 8}}>
          <FlexRow grow={true}>
            <ButtonGroup>
              <Button
                icon={'data-table'}
                onClick={this.onDataClicked}
                selected={this.state.viewMode === 'data'}>
                Data
              </Button>
              <Button
                icon={'gears-two'}
                onClick={this.onStructureClicked}
                selected={this.state.viewMode === 'structure'}>
                Structure
              </Button>
            </ButtonGroup>
            {this.state.viewMode === 'data' && this.state.currentPage ? (
              <PageInfo
                currentRow={this.state.currentPage.start}
                count={this.state.currentPage.count}
                totalRows={this.state.currentPage.total}
                onChange={this.onGoToRow}/>
            ) : null}
            {this.state.viewMode === 'data' && this.state.currentPage ? (
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
        {this.state.error && JSON.stringify(this.state.error)}
      </FlexColumn>
    );
  }
}
