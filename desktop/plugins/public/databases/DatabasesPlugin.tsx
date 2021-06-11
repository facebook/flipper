/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ManagedTable,
  TableBodyColumn,
  TableRows,
  TableBodyRow,
  TableRowSortOrder,
  TableHighlightedRows,
} from 'flipper';
import {
  DatabaseEntry,
  Page,
  plugin,
  Query,
  QueryResult,
  Structure,
} from './index';
import {getStringFromErrorLike} from './utils';
import {Value, renderValue} from './TypeBasedValueRenderer';
import React, {KeyboardEvent, ChangeEvent, useState, useCallback} from 'react';
import ButtonNavigation from './ButtonNavigation';
import DatabaseDetailSidebar from './DatabaseDetailSidebar';
import DatabaseStructure from './DatabaseStructure';
import {
  convertStringToValue,
  constructUpdateQuery,
  isUpdatable,
} from './UpdateQueryUtil';
import sqlFormatter from 'sql-formatter';
import {
  usePlugin,
  useValue,
  Layout,
  useMemoize,
  Toolbar,
  theme,
  styled,
  produce,
} from 'flipper-plugin';
import {
  Select,
  Radio,
  RadioChangeEvent,
  Typography,
  Button,
  Menu,
  Dropdown,
  Input,
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

const {TextArea} = Input;

const {Option} = Select;

const {Text} = Typography;

const BoldSpan = styled.span({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
});
const ErrorBar = styled.div({
  backgroundColor: theme.errorColor,
  color: theme.textColorPrimary,
  lineHeight: '26px',
  textAlign: 'center',
});
const PageInfoContainer = styled(Layout.Horizontal)({alignItems: 'center'});

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
      <ManagedTable
        floating={false}
        columns={columns}
        columnSizes={{time: 75}}
        zebra
        rows={rows}
        horizontallyScrollable
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
          zebra
          rows={page.rows.map((row: Array<Value>, index: number) =>
            transformRow(page.columns, row, index),
          )}
          horizontallyScrollable
          multiHighlight
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
        <Layout.Horizontal grow>
          <ManagedTable
            floating={false}
            multiline
            columnOrder={columns.map((name) => ({
              key: name,
              visible: true,
            }))}
            columns={columns.reduce(
              (acc, val) =>
                Object.assign({}, acc, {[val]: {value: val, resizable: true}}),
              {},
            )}
            zebra
            rows={rows.map((row: Array<Value>, index: number) =>
              transformRow(columns, row, index),
            )}
            horizontallyScrollable
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
        <Layout.Horizontal grow pad>
          <Text>Row id: {query.id}</Text>
        </Layout.Horizontal>
      );
    } else if (query.count && query.count !== null) {
      return (
        <Layout.Horizontal grow pad>
          <Text>Rows affected: {query.count}</Text>
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
    const onMenuClick = useCallback(
      (p: any) => onClick(p.key as string),
      [onClick],
    );
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
      const {selectedDatabaseTable, currentStructure, viewMode, currentPage} =
        instance.state.get();
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
      <Toolbar position="top">
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
        <Toolbar position="top">
          <BoldSpan>Database</BoldSpan>
          <Select
            showSearch
            value={selectedDatabaseName}
            style={{flex: 1}}
            onChange={onDatabaseSelected}>
            {databaseOptions}
          </Select>
          <BoldSpan>Table</BoldSpan>
          <Select
            showSearch
            value={selectedTableName}
            style={{flex: 1}}
            onChange={onDatabaseTableSelected}>
            {tableOptions}
          </Select>
          <div />
          <Button onClick={onRefreshClicked} type="default">
            Refresh
          </Button>
        </Toolbar>
      ) : null}
      {state.viewMode === 'SQL' ? (
        <Layout.Container>
          <Toolbar position="top">
            <BoldSpan>Database</BoldSpan>
            <Select
              showSearch
              value={selectedDatabaseName}
              onChange={onDatabaseSelected}>
              {databaseOptions}
            </Select>
          </Toolbar>
          <Layout.Horizontal pad={theme.space.small} style={{paddingBottom: 0}}>
            <TextArea
              onChange={onQueryChanged}
              onKeyPress={onQueryTextareaKeyPress}
              placeholder="Type query here.."
              value={
                state.query !== null && typeof state.query !== 'undefined'
                  ? state.query.value
                  : undefined
              }
            />
          </Layout.Horizontal>
          <Toolbar position="top">
            <Layout.Right>
              <div />
              <Layout.Horizontal gap={theme.space.small}>
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
                <Button
                  type="primary"
                  onClick={onExecuteClicked}
                  title={'Execute SQL [Ctrl+Return]'}>
                  Execute
                </Button>
              </Layout.Horizontal>
            </Layout.Right>
          </Toolbar>
        </Layout.Container>
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
          {state.viewMode === 'structure' && state.currentStructure ? (
            <DatabaseStructure structure={state.currentStructure} />
          ) : null}
          {state.viewMode === 'SQL' ? (
            <QueryTable
              query={state.queryResult}
              highlightedRowsChanged={queryHighlightedRowsChanged}
            />
          ) : null}
          {state.viewMode === 'tableInfo' ? (
            <Layout.Horizontal
              grow
              pad={theme.space.small}
              style={{paddingBottom: 0}}>
              <TextArea value={sqlFormatter.format(state.tableInfo)} readOnly />
            </Layout.Horizontal>
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
