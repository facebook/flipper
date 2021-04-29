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
  ManagedTable,
  Text,
  Input,
  colors,
  getStringFromErrorLike,
  Textarea,
  TableBodyColumn,
  TableRows,
  TableBodyRow,
  TableRowSortOrder,
  Value,
  renderValue,
  TableHighlightedRows,
} from 'flipper';
import React, {KeyboardEvent, ChangeEvent, useState, useCallback} from 'react';
import {Methods, Events} from './ClientProtocol';
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
import {
  createState,
  PluginClient,
  usePlugin,
  useValue,
  Layout,
  useMemoize,
} from 'flipper-plugin';
import {
  Select,
  Radio,
  RadioChangeEvent,
  Typography,
  Button,
  Menu,
  Dropdown,
} from 'antd';
import {
  ConsoleSqlOutlined,
  DatabaseOutlined,
  DownOutlined,
  HistoryOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  TableOutlined,
} from '@ant-design/icons';

const {Option} = Select;

const PAGE_SIZE = 50;
const FAVORITES_LOCAL_STORAGE_KEY = 'plugin-database-favorites-sql-queries';

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
const PageInfoContainer = styled(Layout.Horizontal)({alignItems: 'center'});
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

type DatabaseEntry = {
  id: number;
  name: string;
  tables: Array<string>;
};

type Query = {
  value: string;
  time: string;
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

const QueryHistory = React.memo(({history}: {history: Array<Query>}) => {
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
    for (let i = 0; i < history.length; i++) {
      const query = history[i];
      const time = query.time;
      const value = query.value;
      rows.push({
        key: `${i}`,
        columns: {time: {value: time}, query: {value: value}},
      });
    }
  }

  return (
    <Layout.Horizontal grow>
      <QueryHistoryManagedTable
        floating={false}
        columns={columns}
        columnSizes={{time: 75}}
        zebra={true}
        rows={rows}
        horizontallyScrollable={true}
      />
    </Layout.Horizontal>
  );
});

type PageInfoProps = {
  currentRow: number;
  count: number;
  totalRows: number;
  onChange: (currentRow: number, count: number) => void;
};

const PageInfo = React.memo((props: PageInfoProps) => {
  const [state, setState] = useState({
    isOpen: false,
    inputValue: String(props.currentRow),
  });

  const onOpen = useCallback(() => {
    setState({...state, isOpen: true});
  }, [state]);

  const onInputChanged = useCallback(
    (e: ChangeEvent<any>) => {
      setState({...state, inputValue: e.target.value});
    },
    [state],
  );

  const onSubmit = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const rowNumber = parseInt(state.inputValue, 10);
        props.onChange(rowNumber - 1, props.count);
        setState({...state, isOpen: false});
      }
    },
    [props, state],
  );

  return (
    <PageInfoContainer grow>
      <div style={{flex: 1}} />
      <Text>
        {props.count === props.totalRows
          ? `${props.count} `
          : `${props.currentRow + 1}-${props.currentRow + props.count} `}
        of {props.totalRows} rows
      </Text>
      <div style={{flex: 1}} />
      {state.isOpen ? (
        <Input
          tabIndex={-1}
          placeholder={(props.currentRow + 1).toString()}
          onChange={onInputChanged}
          onKeyDown={onSubmit}
        />
      ) : (
        <Button style={{textAlign: 'center'}} onClick={onOpen}>
          Go To Row
        </Button>
      )}
    </PageInfoContainer>
  );
});

const DataTable = React.memo(
  ({
    page,
    highlightedRowsChanged,
    sortOrderChanged,
    currentSort,
    currentStructure,
    onRowEdited,
  }: {
    page: Page | null;
    highlightedRowsChanged: (highlightedRows: TableHighlightedRows) => void;
    sortOrderChanged: (sortOrder: TableRowSortOrder) => void;
    currentSort: TableRowSortOrder | null;
    currentStructure: Structure | null;
    onRowEdited: (changes: {[key: string]: string | null}) => void;
  }) =>
    page ? (
      <Layout.Horizontal grow>
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
          onRowHighlighted={highlightedRowsChanged}
          onSort={sortOrderChanged}
          initialSortOrder={currentSort ?? undefined}
        />
        {page.highlightedRows.length === 1 && (
          <DatabaseDetailSidebar
            columnLabels={page.columns}
            columnValues={page.rows[page.highlightedRows[0]]}
            onSave={
              currentStructure &&
              isUpdatable(currentStructure.columns, currentStructure.rows)
                ? onRowEdited
                : undefined
            }
          />
        )}
      </Layout.Horizontal>
    ) : null,
);

const QueryTable = React.memo(
  ({
    query,
    highlightedRowsChanged,
  }: {
    query: QueryResult | null;
    highlightedRowsChanged: (highlightedRows: TableHighlightedRows) => void;
  }) => {
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
        <Layout.Horizontal grow style={{paddingTop: 18}}>
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
            onRowHighlighted={highlightedRowsChanged}
          />
          {table.highlightedRows.length === 1 && (
            <DatabaseDetailSidebar
              columnLabels={table.columns}
              columnValues={table.rows[table.highlightedRows[0]]}
            />
          )}
        </Layout.Horizontal>
      );
    } else if (query.id && query.id !== null) {
      return (
        <Layout.Horizontal grow style={{paddingTop: 18}}>
          <Text style={{paddingTop: 8, paddingLeft: 8}}>
            Row id: {query.id}
          </Text>
        </Layout.Horizontal>
      );
    } else if (query.count && query.count !== null) {
      return (
        <Layout.Horizontal grow style={{paddingTop: 18}}>
          <Text style={{paddingTop: 8, paddingLeft: 8}}>
            Rows affected: {query.count}
          </Text>
        </Layout.Horizontal>
      );
    } else {
      return null;
    }
  },
);

const FavoritesMenu = React.memo(
  ({
    favorites,
    onClick,
  }: {
    favorites: string[];
    onClick: (value: string) => void;
  }) => {
    const onMenuClick = useCallback((p: any) => onClick(p.key as string), [
      onClick,
    ]);
    return (
      <Menu>
        {favorites.map((q) => (
          <Menu.Item key={q} onClick={onMenuClick}>
            {q}
          </Menu.Item>
        ))}
      </Menu>
    );
  },
);

export function plugin(client: PluginClient<Events, Methods>) {
  const pluginState = createState<DatabasesPluginState>({
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
    executionTime: 0,
    tableInfo: '',
    queryHistory: [],
  });

  const favoritesState = createState<string[]>([], {persist: 'favorites'});
  favoritesState.subscribe((favorites) => {
    localStorage.setItem(
      FAVORITES_LOCAL_STORAGE_KEY,
      JSON.stringify(favorites),
    );
  });

  const updateDatabases = (event: {
    databases: Array<{name: string; id: number; tables: Array<string>}>;
  }) => {
    const updates = event.databases;
    const state = pluginState.get();
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
    pluginState.set({
      ...state,
      databases,
      outdatedDatabaseList: false,
      selectedDatabase: selectedDatabase,
      selectedDatabaseTable: selectedTable,
      pageRowNumber: 0,
      currentPage: sameTableSelected ? state.currentPage : null,
      currentStructure: null,
      currentSort: sameTableSelected ? state.currentSort : null,
    });
  };

  const updateSelectedDatabase = (event: {database: number}) => {
    const state = pluginState.get();
    pluginState.set({
      ...state,
      selectedDatabase: event.database,
      selectedDatabaseTable:
        state.databases[event.database - 1].tables[0] || null,
      pageRowNumber: 0,
      currentPage: null,
      currentStructure: null,
      currentSort: null,
    });
  };

  const updateSelectedDatabaseTable = (event: {table: string}) => {
    const state = pluginState.get();
    pluginState.set({
      ...state,
      selectedDatabaseTable: event.table,
      pageRowNumber: 0,
      currentPage: null,
      currentStructure: null,
      currentSort: null,
    });
  };

  const updateViewMode = (event: {
    viewMode: 'data' | 'structure' | 'SQL' | 'tableInfo' | 'queryHistory';
  }) => {
    pluginState.update((state) => {
      state.viewMode = event.viewMode;
      state.error = null;
    });
  };

  const updatePage = (event: Page) => {
    pluginState.update((state) => {
      state.currentPage = event;
    });
  };

  const updateStructure = (event: {
    databaseId: number;
    table: string;
    columns: Array<string>;
    rows: Array<Array<Value>>;
    indexesColumns: Array<string>;
    indexesValues: Array<Array<Value>>;
  }) => {
    pluginState.update((state) => {
      state.currentStructure = {
        databaseId: event.databaseId,
        table: event.table,
        columns: event.columns,
        rows: event.rows,
        indexesColumns: event.indexesColumns,
        indexesValues: event.indexesValues,
      };
    });
  };

  const displaySelect = (event: {
    columns: Array<string>;
    values: Array<Array<Value>>;
  }) => {
    pluginState.update((state) => {
      state.queryResult = {
        table: {
          columns: event.columns,
          rows: event.values,
          highlightedRows: [],
        },
        id: null,
        count: null,
      };
    });
  };

  const displayInsert = (event: {id: number}) => {
    const state = pluginState.get();
    pluginState.set({
      ...state,
      queryResult: {
        table: null,
        id: event.id,
        count: null,
      },
    });
  };

  const displayUpdateDelete = (event: {count: number}) => {
    pluginState.update((state) => {
      state.queryResult = {
        table: null,
        id: null,
        count: event.count,
      };
    });
  };

  const updateTableInfo = (event: {tableInfo: string}) => {
    pluginState.update((state) => {
      state.tableInfo = event.tableInfo;
    });
  };

  const nextPage = () => {
    pluginState.update((state) => {
      state.pageRowNumber += PAGE_SIZE;
      state.currentPage = null;
    });
  };

  const previousPage = () => {
    pluginState.update((state) => {
      state.pageRowNumber = Math.max(state.pageRowNumber - PAGE_SIZE, 0);
      state.currentPage = null;
    });
  };

  const execute = (event: {query: string}) => {
    const timeBefore = Date.now();
    const {query} = event;
    client
      .send('execute', {
        databaseId: pluginState.get().selectedDatabase,
        value: query,
      })
      .then((data) => {
        pluginState.update((state) => {
          state.error = null;
          state.executionTime = Date.now() - timeBefore;
        });
        if (data.type === 'select') {
          displaySelect({
            columns: data.columns,
            values: data.values,
          });
        } else if (data.type === 'insert') {
          displayInsert({
            id: data.insertedId,
          });
        } else if (data.type === 'update_delete') {
          displayUpdateDelete({
            count: data.affectedCount,
          });
        }
      })
      .catch((e) => {
        pluginState.update((state) => {
          state.error = e;
        });
      });
    let newHistory = pluginState.get().queryHistory;
    const newQuery = pluginState.get().query;
    if (
      newQuery !== null &&
      typeof newQuery !== 'undefined' &&
      newHistory !== null &&
      typeof newHistory !== 'undefined'
    ) {
      newQuery.time = dateFormat(new Date(), 'hh:MM:ss');
      newHistory = newHistory.concat(newQuery);
    }
    pluginState.update((state) => {
      state.queryHistory = newHistory;
    });
  };

  const goToRow = (event: {row: number}) => {
    const state = pluginState.get();
    if (!state.currentPage) {
      return;
    }
    const destinationRow =
      event.row < 0
        ? 0
        : event.row >= state.currentPage.total - PAGE_SIZE
        ? Math.max(state.currentPage.total - PAGE_SIZE, 0)
        : event.row;
    pluginState.update((state) => {
      state.pageRowNumber = destinationRow;
      state.currentPage = null;
    });
  };

  const refresh = () => {
    pluginState.update((state) => {
      state.outdatedDatabaseList = true;
      state.currentPage = null;
    });
  };

  const addOrRemoveQueryToFavorites = (query: string) => {
    favoritesState.update((favorites) => {
      const index = favorites.indexOf(query);
      if (index < 0) {
        favorites.push(query);
      } else {
        favorites.splice(index, 1);
      }
    });
  };

  const sortByChanged = (event: {sortOrder: TableRowSortOrder}) => {
    const state = pluginState.get();
    pluginState.set({
      ...state,
      currentSort: event.sortOrder,
      pageRowNumber: 0,
      currentPage: null,
    });
  };

  const updateQuery = (event: {value: string}) => {
    const state = pluginState.get();
    pluginState.set({
      ...state,
      query: {
        value: event.value,
        time: dateFormat(new Date(), 'hh:MM:ss'),
      },
    });
  };

  const pageHighlightedRowsChanged = (event: TableHighlightedRows) => {
    pluginState.update((draftState: DatabasesPluginState) => {
      if (draftState.currentPage !== null) {
        draftState.currentPage.highlightedRows = event.map(parseInt);
      }
    });
  };

  const queryHighlightedRowsChanged = (event: TableHighlightedRows) => {
    pluginState.update((state) => {
      if (state.queryResult) {
        if (state.queryResult.table) {
          state.queryResult.table.highlightedRows = event.map(parseInt);
        }
        state.queryResult.id = null;
        state.queryResult.count = null;
      }
    });
  };

  pluginState.subscribe(
    (newState: DatabasesPluginState, previousState: DatabasesPluginState) => {
      const databaseId = newState.selectedDatabase;
      const table = newState.selectedDatabaseTable;
      if (
        newState.viewMode === 'data' &&
        newState.currentPage === null &&
        databaseId &&
        table
      ) {
        client
          .send('getTableData', {
            count: PAGE_SIZE,
            databaseId: newState.selectedDatabase,
            order: newState.currentSort?.key,
            reverse: (newState.currentSort?.direction || 'up') === 'down',
            table: table,
            start: newState.pageRowNumber,
          })
          .then((data) => {
            updatePage({
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
            pluginState.update((state) => {
              state.error = e;
            });
          });
      }
      if (newState.currentStructure === null && databaseId && table) {
        client
          .send('getTableStructure', {
            databaseId: databaseId,
            table: table,
          })
          .then((data) => {
            updateStructure({
              databaseId: databaseId,
              table: table,
              columns: data.structureColumns,
              rows: data.structureValues,
              indexesColumns: data.indexesColumns,
              indexesValues: data.indexesValues,
            });
          })
          .catch((e) => {
            pluginState.update((state) => {
              state.error = e;
            });
          });
      }
      if (
        newState.viewMode === 'tableInfo' &&
        newState.currentStructure === null &&
        databaseId &&
        table
      ) {
        client
          .send('getTableInfo', {
            databaseId: databaseId,
            table: table,
          })
          .then((data) => {
            updateTableInfo({
              tableInfo: data.definition,
            });
          })
          .catch((e) => {
            pluginState.update((state) => {
              state.error = e;
            });
          });
      }

      if (
        !previousState.outdatedDatabaseList &&
        newState.outdatedDatabaseList
      ) {
        client.send('databaseList', {}).then((databases) => {
          updateDatabases({
            databases,
          });
        });
      }
    },
  );

  client.onConnect(() => {
    client.send('databaseList', {}).then((databases) => {
      updateDatabases({
        databases,
      });
    });
    const loadedFavoritesJson = localStorage.getItem(
      FAVORITES_LOCAL_STORAGE_KEY,
    );
    if (loadedFavoritesJson) {
      try {
        favoritesState.set(JSON.parse(loadedFavoritesJson));
      } catch (err) {
        console.error('Failed to load favorite queries from local storage');
      }
    }
  });

  return {
    state: pluginState,
    favoritesState,
    updateDatabases,
    updateSelectedDatabase,
    updateSelectedDatabaseTable,
    updateViewMode,
    updatePage,
    updateStructure,
    displaySelect,
    displayInsert,
    displayUpdateDelete,
    updateTableInfo,
    nextPage,
    previousPage,
    execute,
    goToRow,
    refresh,
    addOrRemoveQueryToFavorites,
    sortByChanged,
    updateQuery,
    pageHighlightedRowsChanged,
    queryHighlightedRowsChanged,
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const state = useValue(instance.state);
  const favorites = useValue(instance.favoritesState);

  const onViewModeChanged = useCallback(
    (evt: RadioChangeEvent) => {
      instance.updateViewMode({viewMode: evt.target.value ?? 'data'});
    },
    [instance],
  );

  const onDataClicked = useCallback(() => {
    instance.updateViewMode({viewMode: 'data'});
  }, [instance]);

  const onStructureClicked = useCallback(() => {
    instance.updateViewMode({viewMode: 'structure'});
  }, [instance]);

  const onSQLClicked = useCallback(() => {
    instance.updateViewMode({viewMode: 'SQL'});
  }, [instance]);

  const onTableInfoClicked = useCallback(() => {
    instance.updateViewMode({viewMode: 'tableInfo'});
  }, [instance]);

  const onQueryHistoryClicked = useCallback(() => {
    instance.updateViewMode({viewMode: 'queryHistory'});
  }, [instance]);

  const onRefreshClicked = useCallback(() => {
    instance.state.update((state) => {
      state.error = null;
    });
    instance.refresh();
  }, [instance]);

  const onFavoriteButtonClicked = useCallback(() => {
    if (state.query) {
      instance.addOrRemoveQueryToFavorites(state.query.value);
    }
  }, [instance, state.query]);

  const onDatabaseSelected = useCallback(
    (selected: string) => {
      const dbId =
        instance.state.get().databases.find((x) => x.name === selected)?.id ||
        0;
      instance.updateSelectedDatabase({
        database: dbId,
      });
    },
    [instance],
  );

  const onDatabaseTableSelected = useCallback(
    (selected: string) => {
      instance.updateSelectedDatabaseTable({
        table: selected,
      });
    },
    [instance],
  );

  const onNextPageClicked = useCallback(() => {
    instance.nextPage();
  }, [instance]);

  const onPreviousPageClicked = useCallback(() => {
    instance.previousPage();
  }, [instance]);

  const onExecuteClicked = useCallback(() => {
    const query = instance.state.get().query;
    if (query) {
      instance.execute({query: query.value});
    }
  }, [instance]);

  const onQueryTextareaKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Implement ctrl+enter as a shortcut for clicking 'Execute'.
      if (event.key === '\n' && event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        onExecuteClicked();
      }
    },
    [onExecuteClicked],
  );

  const onGoToRow = useCallback(
    (row: number, _count: number) => {
      instance.goToRow({row: row});
    },
    [instance],
  );

  const onQueryChanged = useCallback(
    (selected: any) => {
      instance.updateQuery({
        value: selected.target.value,
      });
    },
    [instance],
  );

  const onFavoriteQuerySelected = useCallback(
    (query: string) => {
      instance.updateQuery({
        value: query,
      });
    },
    [instance],
  );

  const pageHighlightedRowsChanged = useCallback(
    (rows: TableHighlightedRows) => {
      instance.pageHighlightedRowsChanged(rows);
    },
    [instance],
  );

  const queryHighlightedRowsChanged = useCallback(
    (rows: TableHighlightedRows) => {
      instance.queryHighlightedRowsChanged(rows);
    },
    [instance],
  );

  const sortOrderChanged = useCallback(
    (sortOrder: TableRowSortOrder) => {
      instance.sortByChanged({sortOrder});
    },
    [instance],
  );

  const onRowEdited = useCallback(
    (change: {[key: string]: string | null}) => {
      const {
        selectedDatabaseTable,
        currentStructure,
        viewMode,
        currentPage,
      } = instance.state.get();
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
      instance.execute({
        query: constructUpdateQuery(
          selectedDatabaseTable,
          primaryColumnIndexes.reduce((acc, idx) => {
            acc[columns[idx]] = row[idx];
            return acc;
          }, {} as {[key: string]: Value}),
          changeValue,
        ),
      });
      instance.updatePage({
        ...produce(currentPage, (draft) =>
          Object.entries(changeValue).forEach(
            ([key, value]: [string, Value]) => {
              const columnIdx = draft.columns.indexOf(key);
              if (columnIdx >= 0) {
                draft.rows[highlightedRowIdx][columnIdx] = value;
              }
            },
          ),
        ),
      });
    },
    [instance],
  );

  const databaseOptions = useMemoize(
    (databases) =>
      databases.map((x) => (
        <Option key={x.name} value={x.name} label={x.name}>
          {x.name}
        </Option>
      )),
    [state.databases],
  );

  const selectedDatabaseName = useMemoize(
    (selectedDatabase: number, databases: DatabaseEntry[]) =>
      selectedDatabase && databases[state.selectedDatabase - 1]
        ? databases[selectedDatabase - 1].name
        : undefined,
    [state.selectedDatabase, state.databases],
  );

  const tableOptions = useMemoize(
    (selectedDatabase: number, databases: DatabaseEntry[]) =>
      selectedDatabase && databases[state.selectedDatabase - 1]
        ? databases[selectedDatabase - 1].tables.map((tableName) => (
            <Option key={tableName} value={tableName} label={tableName}>
              {tableName}
            </Option>
          ))
        : [],
    [state.selectedDatabase, state.databases],
  );

  const selectedTableName = useMemoize(
    (
      selectedDatabase: number,
      databases: DatabaseEntry[],
      selectedDatabaseTable: string | null,
    ) =>
      selectedDatabase && databases[selectedDatabase - 1]
        ? databases[selectedDatabase - 1].tables.find(
            (t) => t === selectedDatabaseTable,
          ) ?? databases[selectedDatabase - 1].tables[0]
        : undefined,
    [state.selectedDatabase, state.databases, state.selectedDatabaseTable],
  );

  return (
    <Layout.Container grow>
      <Toolbar position="top" style={{paddingLeft: 16}}>
        <Radio.Group value={state.viewMode} onChange={onViewModeChanged}>
          <Radio.Button value="data" onClick={onDataClicked}>
            <TableOutlined style={{marginRight: 5}} />
            <Typography.Text>Data</Typography.Text>
          </Radio.Button>
          <Radio.Button onClick={onStructureClicked} value="structure">
            <SettingOutlined style={{marginRight: 5}} />
            <Typography.Text>Structure</Typography.Text>
          </Radio.Button>
          <Radio.Button onClick={onSQLClicked} value="SQL">
            <ConsoleSqlOutlined style={{marginRight: 5}} />
            <Typography.Text>SQL</Typography.Text>
          </Radio.Button>
          <Radio.Button onClick={onTableInfoClicked} value="tableInfo">
            <DatabaseOutlined style={{marginRight: 5}} />
            <Typography.Text>Table Info</Typography.Text>
          </Radio.Button>
          <Radio.Button onClick={onQueryHistoryClicked} value="queryHistory">
            <HistoryOutlined style={{marginRight: 5}} />
            <Typography.Text>Query History</Typography.Text>
          </Radio.Button>
        </Radio.Group>
      </Toolbar>
      {state.viewMode === 'data' ||
      state.viewMode === 'structure' ||
      state.viewMode === 'tableInfo' ? (
        <Toolbar position="top" style={{paddingLeft: 16}}>
          <BoldSpan style={{marginRight: 16}}>Database</BoldSpan>
          <Select
            showSearch
            value={selectedDatabaseName}
            onChange={onDatabaseSelected}
            style={{width: 200}}>
            {databaseOptions}
          </Select>
          <BoldSpan style={{marginLeft: 16, marginRight: 16}}>Table</BoldSpan>
          <Select
            showSearch
            value={selectedTableName}
            onChange={onDatabaseTableSelected}
            style={{width: 200}}>
            {tableOptions}
          </Select>
          <div />
          <Button onClick={onRefreshClicked}>Refresh</Button>
        </Toolbar>
      ) : null}
      {state.viewMode === 'SQL' ? (
        <div>
          <Toolbar position="top" style={{paddingLeft: 16}}>
            <BoldSpan style={{marginRight: 16}}>Database</BoldSpan>
            <Select
              showSearch
              value={selectedDatabaseName}
              onChange={onDatabaseSelected}
              style={{width: 200}}>
              {databaseOptions}
            </Select>
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
              onChange={onQueryChanged}
              onKeyPress={onQueryTextareaKeyPress}
              placeholder="Type query here.."
              value={
                state.query !== null && typeof state.query !== 'undefined'
                  ? state.query.value
                  : undefined
              }
            />
          }
          <Toolbar
            position="top"
            style={{paddingLeft: 16, paddingTop: 24, paddingBottom: 24}}>
            <Layout.Right>
              <Layout.Horizontal gap>
                <Button
                  icon={
                    state.query && favorites.includes(state.query.value) ? (
                      <StarFilled />
                    ) : (
                      <StarOutlined />
                    )
                  }
                  onClick={onFavoriteButtonClicked}
                />
                <Dropdown
                  overlay={
                    <FavoritesMenu
                      favorites={favorites}
                      onClick={onFavoriteQuerySelected}
                    />
                  }>
                  <Button onClick={() => {}}>
                    Choose from previous queries <DownOutlined />
                  </Button>
                </Dropdown>
              </Layout.Horizontal>
              <Button
                onClick={onExecuteClicked}
                title={'Execute SQL [Ctrl+Return]'}>
                Execute
              </Button>
            </Layout.Right>
          </Toolbar>
        </div>
      ) : null}
      <Layout.Horizontal grow>
        <Layout.Container grow>
          {state.viewMode === 'data' ? (
            <DataTable
              page={state.currentPage}
              highlightedRowsChanged={pageHighlightedRowsChanged}
              onRowEdited={onRowEdited}
              sortOrderChanged={sortOrderChanged}
              currentSort={state.currentSort}
              currentStructure={state.currentStructure}
            />
          ) : null}
          {state.viewMode === 'structure' ? (
            <DatabaseStructure structure={state.currentStructure} />
          ) : null}
          {state.viewMode === 'SQL' ? (
            <QueryTable
              query={state.queryResult}
              highlightedRowsChanged={queryHighlightedRowsChanged}
            />
          ) : null}
          {state.viewMode === 'tableInfo' ? (
            <TableInfoTextArea
              value={sqlFormatter.format(state.tableInfo)}
              readOnly
            />
          ) : null}
          {state.viewMode === 'queryHistory' ? (
            <QueryHistory history={state.queryHistory} />
          ) : null}
        </Layout.Container>
      </Layout.Horizontal>
      <Toolbar position="bottom" style={{paddingLeft: 8}}>
        <Layout.Horizontal grow>
          {state.viewMode === 'SQL' && state.executionTime !== 0 ? (
            <Text> {state.executionTime} ms </Text>
          ) : null}
          {state.viewMode === 'data' && state.currentPage ? (
            <PageInfo
              currentRow={state.currentPage.start}
              count={state.currentPage.count}
              totalRows={state.currentPage.total}
              onChange={onGoToRow}
            />
          ) : null}
          {state.viewMode === 'data' && state.currentPage ? (
            <ButtonNavigation
              canGoBack={state.currentPage.start > 0}
              canGoForward={
                state.currentPage.start + state.currentPage.count <
                state.currentPage.total
              }
              onBack={onPreviousPageClicked}
              onForward={onNextPageClicked}
            />
          ) : null}
        </Layout.Horizontal>
      </Toolbar>
      {state.error && (
        <ErrorBar>{getStringFromErrorLike(state.error)}</ErrorBar>
      )}
    </Layout.Container>
  );
}
