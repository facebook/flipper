/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  styled,
  produce,
  Toolbar,
  Select,
  FlexColumn,
  FlexRow,
  ManagedTable,
  Text,
  Button,
  ButtonGroup,
  Input,
  colors,
  getStringFromErrorLike,
  Spacer,
  Textarea,
  TableBodyColumn,
  TableRows,
  Props as FlipperPluginProps,
  TableBodyRow,
  TableRowSortOrder,
  FlipperPlugin,
  Value,
  renderValue,
} from 'flipper';
import React, {Component, KeyboardEvent, ChangeEvent} from 'react';
import {DatabaseClient} from './ClientProtocol';
import ButtonNavigation from './ButtonNavigation';
import DatabaseDetailSidebar from './DatabaseDetailSidebar';
import DatabaseStructure from './DatabaseStructure';
import {
  convertStringToValue,
  constructUpdateQuery,
  isUpdatable,
} from './UpdateQueryUtil';
import sqlFormatter from 'sql-formatter';
import dateFormat from 'dateformat';

const PAGE_SIZE = 50;

const BoldSpan = styled.span({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});
const ErrorBar = styled.div({
  backgroundColor: colors.cherry,
  color: colors.white,
  lineHeight: '26px',
  textAlign: 'center',
});
const QueryHistoryManagedTable = styled(ManagedTable)({paddingLeft: 16});
const PageInfoContainer = styled(FlexRow)({alignItems: 'center'});
const TableInfoTextArea = styled(Textarea)({
  width: '98%',
  height: '100%',
  marginLeft: '1%',
  marginTop: '1%',
  marginBottom: '1%',
  readOnly: true,
});

type DatabasesPluginState = {
  selectedDatabase: number;
  selectedDatabaseTable: string | null;
  pageRowNumber: number;
  databases: Array<DatabaseEntry>;
  outdatedDatabaseList: boolean;
  viewMode: 'data' | 'structure' | 'SQL' | 'tableInfo' | 'queryHistory';
  error: null;
  currentPage: Page | null;
  currentStructure: Structure | null;
  currentSort: TableRowSortOrder | null;
  query: Query | null;
  queryResult: QueryResult | null;
  favorites: Array<string>;
  executionTime: number;
  tableInfo: string;
  queryHistory: Array<Query>;
};

type Page = {
  databaseId: number;
  table: string;
  columns: Array<string>;
  rows: Array<Array<Value>>;
  start: number;
  count: number;
  total: number;
  highlightedRows: Array<number>;
};

export type Structure = {
  databaseId: number;
  table: string;
  columns: Array<string>;
  rows: Array<Array<Value>>;
  indexesColumns: Array<string>;
  indexesValues: Array<Array<Value>>;
};

type QueryResult = {
  table: QueriedTable | null;
  id: number | null;
  count: number | null;
};

export type QueriedTable = {
  columns: Array<string>;
  rows: Array<Array<Value>>;
  highlightedRows: Array<number>;
};

type Actions =
  | SelectDatabaseEvent
  | SelectDatabaseTableEvent
  | UpdateDatabasesEvent
  | UpdateViewModeEvent
  | UpdatePageEvent
  | UpdateStructureEvent
  | DisplaySelectEvent
  | DisplayInsertEvent
  | DisplayUpdateDeleteEvent
  | UpdateTableInfoEvent
  | NextPageEvent
  | PreviousPageEvent
  | ExecuteEvent
  | RefreshEvent
  | UpdateFavoritesEvent
  | SortByChangedEvent
  | GoToRowEvent
  | UpdateQueryEvent;

type DatabaseEntry = {
  id: number;
  name: string;
  tables: Array<string>;
};

type Query = {
  value: string;
  time: string;
};

type UpdateDatabasesEvent = {
  databases: Array<{name: string; id: number; tables: Array<string>}>;
  type: 'UpdateDatabases';
};

type SelectDatabaseEvent = {
  type: 'UpdateSelectedDatabase';
  database: number;
};

type SelectDatabaseTableEvent = {
  type: 'UpdateSelectedDatabaseTable';
  table: string;
};

type UpdateViewModeEvent = {
  type: 'UpdateViewMode';
  viewMode: 'data' | 'structure' | 'SQL' | 'tableInfo' | 'queryHistory';
};

type UpdatePageEvent = {
  type: 'UpdatePage';
} & Page;

type UpdateStructureEvent = {
  type: 'UpdateStructure';
  databaseId: number;
  table: string;
  columns: Array<string>;
  rows: Array<Array<Value>>;
  indexesColumns: Array<string>;
  indexesValues: Array<Array<Value>>;
};

type DisplaySelectEvent = {
  type: 'DisplaySelect';
  columns: Array<string>;
  values: Array<Array<Value>>;
};

type DisplayInsertEvent = {
  type: 'DisplayInsert';
  id: number;
};

type DisplayUpdateDeleteEvent = {
  type: 'DisplayUpdateDelete';
  count: number;
};

type UpdateTableInfoEvent = {
  type: 'UpdateTableInfo';
  tableInfo: string;
};

type NextPageEvent = {
  type: 'NextPage';
};

type PreviousPageEvent = {
  type: 'PreviousPage';
};

type ExecuteEvent = {
  type: 'Execute';
  query: string;
};

type RefreshEvent = {
  type: 'Refresh';
};

type UpdateFavoritesEvent = {
  type: 'UpdateFavorites';
  favorites: Array<string> | undefined;
};

type SortByChangedEvent = {
  type: 'SortByChanged';
  sortOrder: TableRowSortOrder;
};

type GoToRowEvent = {
  type: 'GoToRow';
  row: number;
};

type UpdateQueryEvent = {
  type: 'UpdateQuery';
  value: string;
};

function transformRow(
  columns: Array<string>,
  row: Array<Value>,
  index: number,
): TableBodyRow {
  const transformedColumns: {[key: string]: TableBodyColumn} = {};
  for (let i = 0; i < columns.length; i++) {
    transformedColumns[columns[i]] = {value: renderValue(row[i], true)};
  }
  return {key: String(index), columns: transformedColumns};
}

function renderQueryHistory(history: Array<Query>) {
  if (!history || typeof history === 'undefined') {
    return null;
  }
  const columns = {
    time: {
      value: 'Time',
      resizable: true,
    },
    query: {
      value: 'Query',
      resizable: true,
    },
  };
  const rows: TableRows = [];
  if (history.length > 0) {
    for (const query of history) {
      const time = query.time;
      const value = query.value;
      rows.push({
        key: value,
        columns: {time: {value: time}, query: {value: value}},
      });
    }
  }

  return (
    <FlexRow grow={true}>
      <QueryHistoryManagedTable
        floating={false}
        columns={columns}
        columnSizes={{time: 75}}
        zebra={true}
        rows={rows}
        horizontallyScrollable={true}
      />
    </FlexRow>
  );
}

type PageInfoProps = {
  currentRow: number;
  count: number;
  totalRows: number;
  onChange: (currentRow: number, count: number) => void;
};

class PageInfo extends Component<
  PageInfoProps,
  {isOpen: boolean; inputValue: string}
> {
  constructor(props: PageInfoProps) {
    super(props);
    this.state = {isOpen: false, inputValue: String(props.currentRow)};
  }

  onOpen() {
    this.setState({isOpen: true});
  }

  onInputChanged(e: ChangeEvent<any>) {
    this.setState({inputValue: e.target.value});
  }

  onSubmit(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const rowNumber = parseInt(this.state.inputValue, 10);
      this.props.onChange(rowNumber - 1, this.props.count);
      this.setState({isOpen: false});
    }
  }

  render() {
    return (
      <PageInfoContainer grow={true}>
        <div style={{flex: 1}} />
        <Text>
          {this.props.count === this.props.totalRows
            ? `${this.props.count} `
            : `${this.props.currentRow + 1}-${
                this.props.currentRow + this.props.count
              } `}
          of {this.props.totalRows} rows
        </Text>
        <div style={{flex: 1}} />
        {this.state.isOpen ? (
          <Input
            tabIndex={-1}
            placeholder={(this.props.currentRow + 1).toString()}
            onChange={this.onInputChanged.bind(this)}
            onKeyDown={this.onSubmit.bind(this)}
          />
        ) : (
          <Button
            style={{textAlign: 'center'}}
            onClick={this.onOpen.bind(this)}>
            Go To Row
          </Button>
        )}
      </PageInfoContainer>
    );
  }
}

export default class DatabasesPlugin extends FlipperPlugin<
  DatabasesPluginState,
  Actions,
  {}
> {
  databaseClient: DatabaseClient;

  state: DatabasesPluginState = {
    selectedDatabase: 0,
    selectedDatabaseTable: null,
    pageRowNumber: 0,
    databases: [],
    outdatedDatabaseList: true,
    viewMode: 'data',
    error: null,
    currentPage: null,
    currentStructure: null,
    currentSort: null,
    query: null,
    queryResult: null,
    favorites: [],
    executionTime: 0,
    tableInfo: '',
    queryHistory: [],
  };

  reducers = ([
    [
      'UpdateDatabases',
      (
        state: DatabasesPluginState,
        results: UpdateDatabasesEvent,
      ): DatabasesPluginState => {
        const updates = results.databases;
        const databases = updates.sort((db1, db2) => db1.id - db2.id);
        const selectedDatabase =
          state.selectedDatabase ||
          (Object.values(databases)[0] ? Object.values(databases)[0].id : 0);
        const selectedTable =
          state.selectedDatabaseTable &&
          databases[selectedDatabase - 1].tables.includes(
            state.selectedDatabaseTable,
          )
            ? state.selectedDatabaseTable
            : databases[selectedDatabase - 1].tables[0];
        const sameTableSelected =
          selectedDatabase === state.selectedDatabase &&
          selectedTable === state.selectedDatabaseTable;
        return {
          ...state,
          databases,
          outdatedDatabaseList: false,
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
          error: null,
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
          currentPage: event,
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
            rows: event.rows,
            indexesColumns: event.indexesColumns,
            indexesValues: event.indexesValues,
          },
        };
      },
    ],
    [
      'DisplaySelect',
      (
        state: DatabasesPluginState,
        event: DisplaySelectEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          queryResult: {
            table: {
              columns: event.columns,
              rows: event.values,
              highlightedRows: [],
            },
            id: null,
            count: null,
          },
        };
      },
    ],
    [
      'DisplayInsert',
      (
        state: DatabasesPluginState,
        event: DisplayInsertEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          queryResult: {
            table: null,
            id: event.id,
            count: null,
          },
        };
      },
    ],

    [
      'DisplayUpdateDelete',
      (
        state: DatabasesPluginState,
        event: DisplayUpdateDeleteEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          queryResult: {
            table: null,
            id: null,
            count: event.count,
          },
        };
      },
    ],
    [
      'UpdateTableInfo',
      (
        state: DatabasesPluginState,
        event: UpdateTableInfoEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          tableInfo: event.tableInfo,
        };
      },
    ],
    [
      'NextPage',
      (
        state: DatabasesPluginState,
        _event: UpdatePageEvent,
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
        _event: UpdatePageEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          pageRowNumber: Math.max(state.pageRowNumber - PAGE_SIZE, 0),
          currentPage: null,
        };
      },
    ],
    [
      'Execute',
      (
        state: DatabasesPluginState,
        event: ExecuteEvent,
      ): DatabasesPluginState => {
        const timeBefore = Date.now();
        const {query} = event;
        this.databaseClient
          .getExecution({databaseId: state.selectedDatabase, value: query})
          .then((data) => {
            this.setState({
              error: null,
              executionTime: Date.now() - timeBefore,
            });
            if (data.type === 'select') {
              this.dispatchAction({
                type: 'DisplaySelect',
                columns: data.columns,
                values: data.values,
              });
            } else if (data.type === 'insert') {
              this.dispatchAction({
                type: 'DisplayInsert',
                id: data.insertedId,
              });
            } else if (data.type === 'update_delete') {
              this.dispatchAction({
                type: 'DisplayUpdateDelete',
                count: data.affectedCount,
              });
            }
          })
          .catch((e) => {
            this.setState({error: e});
          });
        let newHistory = this.state.queryHistory;
        const newQuery = this.state.query;
        if (
          newQuery !== null &&
          typeof newQuery !== 'undefined' &&
          newHistory !== null &&
          typeof newHistory !== 'undefined'
        ) {
          newQuery.time = dateFormat(new Date(), 'hh:MM:ss');
          newHistory = newHistory.concat(newQuery);
        }
        return {
          ...state,
          queryHistory: newHistory,
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
        const destinationRow =
          event.row < 0
            ? 0
            : event.row >= state.currentPage.total - PAGE_SIZE
            ? Math.max(state.currentPage.total - PAGE_SIZE, 0)
            : event.row;
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
        _event: RefreshEvent,
      ): DatabasesPluginState => {
        return {
          ...state,
          outdatedDatabaseList: true,
          currentPage: null,
        };
      },
    ],
    [
      'UpdateFavorites',
      (
        state: DatabasesPluginState,
        event: UpdateFavoritesEvent,
      ): DatabasesPluginState => {
        let newFavorites = event.favorites || state.favorites;
        if (
          state.query &&
          state.query !== null &&
          typeof state.query !== 'undefined'
        ) {
          const value = state.query.value;
          if (newFavorites.includes(value)) {
            const index = newFavorites.indexOf(value);
            newFavorites.splice(index, 1);
          } else {
            newFavorites = state.favorites.concat(value);
          }
        }
        window.localStorage.setItem(
          'plugin-database-favorites-sql-queries',
          JSON.stringify(newFavorites),
        );
        return {
          ...state,
          favorites: newFavorites,
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
          error: null,
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
    [
      'UpdateQuery',
      (state: DatabasesPluginState, event: UpdateQueryEvent) => {
        return {
          ...state,
          query: {
            value: event.value,
            time: dateFormat(new Date(), 'hh:MM:ss'),
          },
        };
      },
    ],
  ] as Array<
    [
      string,
      (
        state: DatabasesPluginState,
        event: UpdateQueryEvent,
      ) => DatabasesPluginState,
    ]
  >).reduce(
    (
      acc: {
        [name: string]: (
          state: DatabasesPluginState,
          event: UpdateQueryEvent,
        ) => DatabasesPluginState;
      },
      val: [
        string,
        (
          state: DatabasesPluginState,
          event: UpdateQueryEvent,
        ) => DatabasesPluginState,
      ],
    ) => {
      const name = val[0];
      const f = val[1];

      acc[name] = (previousState, event) => {
        const newState = f(previousState, event);
        this.onStateChanged(previousState, newState);
        return newState;
      };
      return acc;
    },
    {},
  );

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
        .then((data) => {
          this.dispatchAction({
            type: 'UpdatePage',
            databaseId: databaseId,
            table: table,
            columns: data.columns,
            rows: data.values,
            start: data.start,
            count: data.count,
            total: data.total,
            highlightedRows: [],
          });
        })
        .catch((e) => {
          this.setState({error: e});
        });
    }
    if (newState.currentStructure === null && databaseId && table) {
      this.databaseClient
        .getTableStructure({
          databaseId: databaseId,
          table: table,
        })
        .then((data) => {
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
        .catch((e) => {
          this.setState({error: e});
        });
    }
    if (
      newState.viewMode === 'tableInfo' &&
      newState.currentStructure === null &&
      databaseId &&
      table
    ) {
      this.databaseClient
        .getTableInfo({
          databaseId: databaseId,
          table: table,
        })
        .then((data) => {
          this.dispatchAction({
            type: 'UpdateTableInfo',
            tableInfo: data.definition,
          });
        })
        .catch((e) => {
          this.setState({error: e});
        });
    }

    if (!previousState.outdatedDatabaseList && newState.outdatedDatabaseList) {
      this.databaseClient.getDatabases({}).then((databases) => {
        this.dispatchAction({
          type: 'UpdateDatabases',
          databases,
        });
      });
    }
  }

  // to keep eslint happy
  constructor(props: FlipperPluginProps<{}>) {
    super(props);
    this.databaseClient = new DatabaseClient(this.client);
  }

  init() {
    this.databaseClient = new DatabaseClient(this.client);
    this.databaseClient.getDatabases({}).then((databases) => {
      this.dispatchAction({
        type: 'UpdateDatabases',
        databases,
      });
    });
    this.dispatchAction({
      type: 'UpdateFavorites',
      favorites: JSON.parse(
        localStorage.getItem('plugin-database-favorites-sql-queries') || '[]',
      ),
    });
  }

  onDataClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'data'});
  };

  onStructureClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'structure'});
  };

  onSQLClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'SQL'});
  };

  onTableInfoClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'tableInfo'});
  };

  onQueryHistoryClicked = () => {
    this.dispatchAction({type: 'UpdateViewMode', viewMode: 'queryHistory'});
  };

  onRefreshClicked = () => {
    this.setState({error: null});
    this.dispatchAction({type: 'Refresh'});
  };

  onFavoritesClicked = () => {
    this.dispatchAction({
      type: 'UpdateFavorites',
      favorites: this.state.favorites,
    });
  };

  onDatabaseSelected = (selected: string) => {
    const dbId = this.state.databases.find((x) => x.name === selected)?.id || 0;
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

  onExecuteClicked = () => {
    if (this.state.query !== null) {
      this.dispatchAction({type: 'Execute', query: this.state.query.value});
    }
  };

  onQueryTextareaKeyPress = (event: KeyboardEvent) => {
    // Implement ctrl+enter as a shortcut for clicking 'Execute'.
    if (event.key === '\n' && event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      this.onExecuteClicked();
    }
  };

  onFavoriteClicked = (selected: any) => {
    this.setState({query: selected.target.value});
  };

  onGoToRow = (row: number, _count: number) => {
    this.dispatchAction({type: 'GoToRow', row: row});
  };

  onQueryChanged = (selected: any) => {
    this.dispatchAction({
      type: 'UpdateQuery',
      value: selected.target.value,
    });
  };

  onRowEdited(change: {[key: string]: string | null}) {
    const {
      selectedDatabaseTable,
      currentStructure,
      viewMode,
      currentPage,
    } = this.state;
    const highlightedRowIdx = currentPage?.highlightedRows[0] ?? -1;
    const row =
      highlightedRowIdx >= 0
        ? currentPage?.rows[currentPage?.highlightedRows[0]]
        : undefined;
    const columns = currentPage?.columns;
    // currently only allow to edit data shown in Data tab
    if (
      viewMode !== 'data' ||
      selectedDatabaseTable === null ||
      currentStructure === null ||
      currentPage === null ||
      row === undefined ||
      columns === undefined ||
      // only trigger when there is change
      Object.keys(change).length <= 0
    ) {
      return;
    }
    // check if the table has primary key to use for query
    // This is assumed data are in the same format as in SqliteDatabaseDriver.java
    const primaryKeyIdx = currentStructure.columns.indexOf('primary_key');
    const nameKeyIdx = currentStructure.columns.indexOf('column_name');
    const typeIdx = currentStructure.columns.indexOf('data_type');
    const nullableIdx = currentStructure.columns.indexOf('nullable');
    if (primaryKeyIdx < 0 && nameKeyIdx < 0 && typeIdx < 0) {
      console.error(
        'primary_key, column_name, and/or data_type cannot be empty',
      );
      return;
    }
    const primaryColumnIndexes = currentStructure.rows
      .reduce((acc, row) => {
        const primary = row[primaryKeyIdx];
        if (primary.type === 'boolean' && primary.value) {
          const name = row[nameKeyIdx];
          return name.type === 'string' ? acc.concat(name.value) : acc;
        } else {
          return acc;
        }
      }, [] as Array<string>)
      .map((name) => columns.indexOf(name))
      .filter((idx) => idx >= 0);
    // stop if no primary key to distinguish unique query
    if (primaryColumnIndexes.length <= 0) {
      return;
    }

    const types = currentStructure.rows.reduce((acc, row) => {
      const nameValue = row[nameKeyIdx];
      const name = nameValue.type === 'string' ? nameValue.value : null;
      const typeValue = row[typeIdx];
      const type = typeValue.type === 'string' ? typeValue.value : null;
      const nullableValue =
        nullableIdx < 0 ? {type: 'null', value: null} : row[nullableIdx];
      const nullable = nullableValue.value !== false;
      if (name !== null && type !== null) {
        acc[name] = {type, nullable};
      }
      return acc;
    }, {} as {[key: string]: {type: string; nullable: boolean}});

    const changeValue = Object.entries(change).reduce(
      (acc, [key, value]: [string, string | null]) => {
        acc[key] = convertStringToValue(types, key, value);
        return acc;
      },
      {} as {[key: string]: Value},
    );
    this.dispatchAction({
      type: 'Execute',
      query: constructUpdateQuery(
        selectedDatabaseTable,
        primaryColumnIndexes.reduce((acc, idx) => {
          acc[columns[idx]] = row[idx];
          return acc;
        }, {} as {[key: string]: Value}),
        changeValue,
      ),
    });
    this.dispatchAction({
      type: 'UpdatePage',
      ...produce(currentPage, (draft) =>
        Object.entries(changeValue).forEach(([key, value]: [string, Value]) => {
          const columnIdx = draft.columns.indexOf(key);
          if (columnIdx >= 0) {
            draft.rows[highlightedRowIdx][columnIdx] = value;
          }
        }),
      ),
    });
  }

  renderTable(page: Page | null) {
    if (!page) {
      return null;
    }
    return (
      <FlexRow grow={true}>
        <ManagedTable
          tableKey={`databases-${page.databaseId}-${page.table}`}
          floating={false}
          columnOrder={page.columns.map((name) => ({
            key: name,
            visible: true,
          }))}
          columns={page.columns.reduce(
            (acc, val) =>
              Object.assign({}, acc, {
                [val]: {value: val, resizable: true, sortable: true},
              }),
            {},
          )}
          zebra={true}
          rows={page.rows.map((row: Array<Value>, index: number) =>
            transformRow(page.columns, row, index),
          )}
          horizontallyScrollable={true}
          multiHighlight={true}
          onRowHighlighted={(highlightedRows) =>
            this.setState(
              produce((draftState: DatabasesPluginState) => {
                if (draftState.currentPage !== null) {
                  draftState.currentPage.highlightedRows = highlightedRows.map(
                    parseInt,
                  );
                }
              }),
            )
          }
          onSort={(sortOrder: TableRowSortOrder) => {
            this.dispatchAction({
              type: 'SortByChanged',
              sortOrder,
            });
          }}
          initialSortOrder={this.state.currentSort ?? undefined}
        />
        {page.highlightedRows.length === 1 && (
          <DatabaseDetailSidebar
            columnLabels={page.columns}
            columnValues={page.rows[page.highlightedRows[0]]}
            onSave={
              this.state.currentStructure &&
              isUpdatable(
                this.state.currentStructure.columns,
                this.state.currentStructure.rows,
              )
                ? this.onRowEdited.bind(this)
                : undefined
            }
          />
        )}
      </FlexRow>
    );
  }

  renderQuery(query: QueryResult | null) {
    if (!query || query === null) {
      return null;
    }
    if (
      query.table &&
      typeof query.table !== 'undefined' &&
      query.table !== null
    ) {
      const table = query.table;
      const columns = table.columns;
      const rows = table.rows;
      return (
        <FlexRow grow={true} style={{paddingTop: 18}}>
          <ManagedTable
            floating={false}
            multiline={true}
            columnOrder={columns.map((name) => ({
              key: name,
              visible: true,
            }))}
            columns={columns.reduce(
              (acc, val) =>
                Object.assign({}, acc, {[val]: {value: val, resizable: true}}),
              {},
            )}
            zebra={true}
            rows={rows.map((row: Array<Value>, index: number) =>
              transformRow(columns, row, index),
            )}
            horizontallyScrollable={true}
            onRowHighlighted={(highlightedRows) => {
              this.setState({
                queryResult: {
                  table: {
                    columns: columns,
                    rows: rows,
                    highlightedRows: highlightedRows.map(parseInt),
                  },
                  id: null,
                  count: null,
                },
              });
            }}
          />
          {table.highlightedRows.length === 1 && (
            <DatabaseDetailSidebar
              columnLabels={table.columns}
              columnValues={table.rows[table.highlightedRows[0]]}
            />
          )}
        </FlexRow>
      );
    } else if (query.id && query.id !== null) {
      return (
        <FlexRow grow={true} style={{paddingTop: 18}}>
          <Text style={{paddingTop: 8, paddingLeft: 8}}>
            Row id: {query.id}
          </Text>
        </FlexRow>
      );
    } else if (query.count && query.count !== null) {
      return (
        <FlexRow grow={true} style={{paddingTop: 18}}>
          <Text style={{paddingTop: 8, paddingLeft: 8}}>
            Rows affected: {query.count}
          </Text>
        </FlexRow>
      );
    } else {
      return null;
    }
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
        <Toolbar position="top" style={{paddingLeft: 16}}>
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
            <Button
              icon={'magnifying-glass'}
              onClick={this.onSQLClicked}
              selected={this.state.viewMode === 'SQL'}>
              SQL
            </Button>
            <Button
              icon={'info-cursive'}
              onClick={this.onTableInfoClicked}
              selected={this.state.viewMode === 'tableInfo'}>
              Table Info
            </Button>
            <Button
              icon={'on-this-day'}
              iconSize={12}
              onClick={this.onQueryHistoryClicked}
              selected={this.state.viewMode === 'queryHistory'}>
              Query History
            </Button>
          </ButtonGroup>
        </Toolbar>
        {this.state.viewMode === 'data' ||
        this.state.viewMode === 'structure' ||
        this.state.viewMode === 'tableInfo' ? (
          <Toolbar position="top" style={{paddingLeft: 16}}>
            <BoldSpan style={{marginRight: 16}}>Database</BoldSpan>
            <Select
              options={this.state.databases
                .map((x) => x.name)
                .reduce(
                  (obj, item) => Object.assign({}, obj, {[item]: item}),
                  {},
                )}
              selected={
                this.state.databases[this.state.selectedDatabase - 1]?.name
              }
              onChange={this.onDatabaseSelected}
              style={{maxWidth: 300}}
            />
            <BoldSpan style={{marginLeft: 16, marginRight: 16}}>Table</BoldSpan>
            <Select
              options={tableOptions}
              selected={this.state.selectedDatabaseTable}
              onChange={this.onDatabaseTableSelected}
              style={{maxWidth: 300}}
            />
            <div />
            <Button onClick={this.onRefreshClicked}>Refresh</Button>
          </Toolbar>
        ) : null}
        {this.state.viewMode === 'SQL' ? (
          <div>
            <Toolbar position="top" style={{paddingLeft: 16}}>
              <BoldSpan style={{marginRight: 16}}>Database</BoldSpan>
              <Select
                options={this.state.databases
                  .map((x) => x.name)
                  .reduce(
                    (obj, item) => Object.assign({}, obj, {[item]: item}),
                    {},
                  )}
                selected={
                  this.state.databases[this.state.selectedDatabase - 1]?.name
                }
                onChange={this.onDatabaseSelected}
              />
            </Toolbar>
            {
              <Textarea
                style={{
                  width: '98%',
                  height: '40%',
                  marginLeft: 16,
                  marginTop: '1%',
                  marginBottom: '1%',
                  resize: 'vertical',
                }}
                onChange={this.onQueryChanged.bind(this)}
                onKeyPress={this.onQueryTextareaKeyPress}
                placeholder="Type query here.."
                value={
                  this.state.query !== null &&
                  typeof this.state.query !== 'undefined'
                    ? this.state.query.value
                    : undefined
                }
              />
            }
            <Toolbar
              position="top"
              style={{paddingLeft: 16, paddingTop: 24, paddingBottom: 24}}>
              <ButtonGroup>
                <Button
                  icon={'star'}
                  iconSize={12}
                  iconVariant={
                    this.state.query !== null &&
                    typeof this.state.query !== 'undefined' &&
                    this.state.favorites.includes(this.state.query.value)
                      ? 'filled'
                      : 'outline'
                  }
                  onClick={this.onFavoritesClicked}
                />
                {this.state.favorites !== null ? (
                  <Button
                    dropdown={this.state.favorites.map((option) => {
                      return {
                        click: () => {
                          this.setState({
                            query: {
                              value: option,
                              time: dateFormat(new Date(), 'hh:MM:ss'),
                            },
                          });
                          this.onQueryChanged.bind(this);
                        },
                        label: option,
                      };
                    })}>
                    Choose from previous queries
                  </Button>
                ) : null}
              </ButtonGroup>
              <Spacer />
              <ButtonGroup>
                <Button
                  onClick={this.onExecuteClicked}
                  title={'Execute SQL [Ctrl+Return]'}>
                  Execute
                </Button>
              </ButtonGroup>
            </Toolbar>
          </div>
        ) : null}
        <FlexRow grow={true}>
          <FlexColumn grow={true}>
            {this.state.viewMode === 'data'
              ? this.renderTable(this.state.currentPage)
              : null}
            {this.state.viewMode === 'structure' ? (
              <DatabaseStructure structure={this.state.currentStructure} />
            ) : null}
            {this.state.viewMode === 'SQL'
              ? this.renderQuery(this.state.queryResult)
              : null}
            {this.state.viewMode === 'tableInfo' ? (
              <TableInfoTextArea
                value={sqlFormatter.format(this.state.tableInfo)}
              />
            ) : null}
            {this.state.viewMode === 'queryHistory'
              ? renderQueryHistory(this.state.queryHistory)
              : null}
          </FlexColumn>
        </FlexRow>
        <Toolbar position="bottom" style={{paddingLeft: 8}}>
          <FlexRow grow={true}>
            {this.state.viewMode === 'SQL' && this.state.executionTime !== 0 ? (
              <Text> {this.state.executionTime} ms </Text>
            ) : null}
            {this.state.viewMode === 'data' && this.state.currentPage ? (
              <PageInfo
                currentRow={this.state.currentPage.start}
                count={this.state.currentPage.count}
                totalRows={this.state.currentPage.total}
                onChange={this.onGoToRow}
              />
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
        {this.state.error && (
          <ErrorBar>{getStringFromErrorLike(this.state.error)}</ErrorBar>
        )}
      </FlexColumn>
    );
  }
}
