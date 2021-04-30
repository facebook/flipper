/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TableRowSortOrder, TableHighlightedRows} from 'flipper';
import {Value} from './TypeBasedValueRenderer';
import {Methods, Events} from './ClientProtocol';
import dateFormat from 'dateformat';
import {createState, PluginClient} from 'flipper-plugin';
export {Component} from './DatabasesPlugin';

const PAGE_SIZE = 50;
const FAVORITES_LOCAL_STORAGE_KEY = 'plugin-database-favorites-sql-queries';

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

export type Page = {
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

export type QueryResult = {
  table: QueriedTable | null;
  id: number | null;
  count: number | null;
};

export type QueriedTable = {
  columns: Array<string>;
  rows: Array<Array<Value>>;
  highlightedRows: Array<number>;
};

export type DatabaseEntry = {
  id: number;
  name: string;
  tables: Array<string>;
};

export type Query = {
  value: string;
  time: string;
};

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
