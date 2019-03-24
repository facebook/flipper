/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableHighlightedRows,
  TableRows,
  TableColumnSizes,
  TableColumns,
  TableColumnOrder,
  TableColumnOrderVal,
  TableBodyRow,
} from 'flipper';

import FlexColumn from './ui/components/FlexColumn';
import Button from './ui/components/Button';
import DetailSidebar from './chrome/DetailSidebar';
import {FlipperPlugin} from './plugin';
import SearchableTable from './ui/components/searchable/SearchableTable';
import textContent from './utils/textContent.js';
import createPaste from './fb-stubs/createPaste.js';

type ID = string;

type RowData = {
  id: ID,
  columns?: {[key: string]: any},
  details?: Object,
};

type Numbered<T> = {
  ...T,
  id: ID,
  rowNumber: number,
};

type TableMetadata = {
  columns: TableColumns,
  columnSizes?: TableColumnSizes,
  columnOrder?: Array<TableColumnOrderVal>,
  filterableColumns?: Set<string>,
};

type Props<T> = {|
  method: string,
  resetMethod?: string,
  ...
    | {|
        columns: TableColumns,
        columnSizes?: TableColumnSizes,
        columnOrder?: TableColumnOrder,
        filterableColumns?: Set<string>,
      |}
    | {|
        id: string,
        title: string,
      |},
  renderSidebar: (row: T) => any,
  buildRow: (row: T, previousData: ?T) => TableBodyRow,
|};

type PersistedState<T> = {|
  rows: TableRows,
  datas: {[key: ID]: Numbered<T>},
  tableMetadata: ?TableMetadata,
|};

type State = {|
  selectedIds: Array<ID>,
|};

/**
 * createTablePlugin creates a Plugin class which handles fetching data from the client and
 * displaying in in a table. The table handles selection of items and rendering a sidebar where
 * more detailed information can be presented about the selected row.
 *
 * The plugin expects the be able to subscribe to the `method` argument and recieve either an array
 * of data objects or a single data object. Each data object represents a row in the table which is
 * build by calling the `buildRow` function argument.
 *
 * The component can be constructed directly with the table metadata in props,
 or if omitted, will call the mobile plugin to dynamically determine the table metadata.
 *
 * An optional resetMethod argument can be provided which will replace the current rows with the
 * data provided. This is useful when connecting to Flipper for this first time, or reconnecting to
 * the client in an unknown state.
 */
export function createTablePlugin<T: RowData>(props: Props<T>) {
  return class extends FlipperPlugin<State, *, PersistedState<T>> {
    static keyboardActions = ['clear', 'createPaste'];
    static id = props.id || '';
    static title = props.title || '';

    static defaultPersistedState: PersistedState<T> = {
      rows: [],
      datas: {},
      tableMetadata: props.columns
        ? {
            columns: props.columns,
            columnSizes: props.columnSizes,
            columnOrder: props.columnOrder,
            filterableColumns: props.filterableColumns,
          }
        : null,
    };

    static persistedStateReducer = (
      persistedState: PersistedState<T>,
      method: string,
      payload: T | Array<T>,
    ): $Shape<PersistedState<T>> => {
      if (method === props.method) {
        const newRows = [];
        const newData = {};
        const datas = Array.isArray(payload) ? payload : [payload];

        for (const data of datas.reverse()) {
          if (data.id == null) {
            console.warn('The data sent did not contain an ID.', data);
          }
          const previousRowData: ?Numbered<T> = persistedState.datas[data.id];
          const newRow = props.buildRow(data, previousRowData);
          if (persistedState.datas[data.id] == null) {
            newData[data.id] = {
              ...data,
              rowNumber: persistedState.rows.length + newRows.length,
            };
            newRows.push(newRow);
          } else {
            persistedState.rows = persistedState.rows
              .slice(0, persistedState.datas[data.id].rowNumber)
              .concat(
                [newRow],
                persistedState.rows.slice(
                  persistedState.datas[data.id].rowNumber + 1,
                ),
              );
          }
        }
        return {
          ...persistedState,
          datas: {...persistedState.datas, ...newData},
          rows: [...persistedState.rows, ...newRows],
        };
      } else if (method === props.resetMethod) {
        return {
          ...persistedState,
          rows: [],
          datas: {},
        };
      } else {
        return {};
      }
    };

    state = {
      selectedIds: [],
    };

    init() {
      this.getTableMetadata();
    }

    getTableMetadata = () => {
      if (!this.props.persistedState.tableMetadata) {
        this.client.call('getMetadata').then(metadata => {
          this.props.setPersistedState({
            tableMetadata: {
              ...metadata,
              filterableColumns: new Set(metadata.filterableColumns),
            },
          });
        });
      }
    };

    onKeyboardAction = (action: string) => {
      if (action === 'clear') {
        this.clear();
      } else if (action === 'createPaste') {
        this.createPaste();
      }
    };

    clear = () => {
      this.props.setPersistedState({
        rows: [],
        datas: {},
      });
      this.setState({
        selectedIds: [],
      });
    };

    createPaste = () => {
      if (!this.props.persistedState.tableMetadata) {
        return;
      }
      let paste = '';
      const mapFn = row =>
        (
          (this.props.persistedState.tableMetadata &&
            Object.keys(this.props.persistedState.tableMetadata.columns)) ||
          []
        )
          .map(key => textContent(row.columns[key].value))
          .join('\t');

      if (this.state.selectedIds.length > 0) {
        // create paste from selection
        paste = this.props.persistedState.rows
          .filter(row => this.state.selectedIds.indexOf(row.key) > -1)
          .map(mapFn)
          .join('\n');
      } else {
        // create paste with all rows
        paste = this.props.persistedState.rows.map(mapFn).join('\n');
      }
      createPaste(paste);
    };

    onRowHighlighted = (keys: TableHighlightedRows) => {
      this.setState({
        selectedIds: keys,
      });
    };

    // We don't necessarily have the table metadata at the time when buildRow
    // is being used. This includes presentation layer info like which
    // columns should be filterable. This does a pass over the built rows and
    // applies that presentation layer information.
    applyMetadataToRows(rows: TableRows): TableRows {
      if (!this.props.persistedState.tableMetadata) {
        console.error(
          'applyMetadataToRows called without tableMetadata present',
        );
        return rows;
      }
      return rows.map(r => {
        return {
          ...r,
          columns: Object.keys(r.columns).reduce((map, columnName) => {
            map[columnName].isFilterable =
              this.props.persistedState.tableMetadata &&
              this.props.persistedState.tableMetadata.filterableColumns
                ? this.props.persistedState.tableMetadata.filterableColumns.has(
                    columnName,
                  )
                : false;
            return map;
          }, r.columns),
        };
      });
    }

    renderSidebar = () => {
      const renderSidebar = props.renderSidebar;
      const {selectedIds} = this.state;
      const {datas} = this.props.persistedState;
      const selectedId = selectedIds.length !== 1 ? null : selectedIds[0];

      if (selectedId != null) {
        return renderSidebar(datas[selectedId]);
      } else {
        return null;
      }
    };

    render() {
      if (!this.props.persistedState.tableMetadata) {
        return 'Loading...';
      }
      const {
        columns,
        columnSizes,
        columnOrder,
      } = this.props.persistedState.tableMetadata;
      const {rows} = this.props.persistedState;

      return (
        <FlexColumn grow={true}>
          <SearchableTable
            key={this.constructor.id}
            rowLineHeight={28}
            floating={false}
            multiline={true}
            columnSizes={columnSizes}
            columnOrder={columnOrder}
            columns={columns}
            onRowHighlighted={this.onRowHighlighted}
            multiHighlight={true}
            rows={this.applyMetadataToRows(rows)}
            stickyBottom={true}
            actions={<Button onClick={this.clear}>Clear Table</Button>}
          />
          <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
        </FlexColumn>
      );
    }
  };
}
