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
};

type Props<T> = {|
  method: string,
  resetMethod?: string,
  columns: TableColumns,
  columnSizes: TableColumnSizes,
  renderSidebar: (row: T) => any,
  buildRow: (row: T) => any,
|};

type PersistedState<T> = {|
  rows: TableRows,
  datas: {[key: ID]: T},
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
 * An optional resetMethod argument can be provided which will replace the current rows with the
 * data provided. This is useful when connecting to Flipper for this first time, or reconnecting to
 * the client in an unknown state.
 */
export function createTablePlugin<T: RowData>(props: Props<T>) {
  return class extends FlipperPlugin<State, *, PersistedState<T>> {
    static keyboardActions = ['clear', 'createPaste'];

    static defaultPersistedState: PersistedState<T> = {
      rows: [],
      datas: {},
    };

    static persistedStateReducer = (
      persistedState: PersistedState<T>,
      method: string,
      payload: T | Array<T>,
    ): $Shape<PersistedState<RowData>> => {
      if (method === props.method) {
        const newRows = [];
        const newData = {};
        const datas = Array.isArray(payload) ? payload : [payload];

        for (const data of datas.reverse()) {
          if (data.id == null) {
            console.warn('The data sent did not contain an ID.', data);
          }
          if (persistedState.datas[data.id] == null) {
            newData[data.id] = data;
            newRows.push(props.buildRow(data));
          }
        }
        return {
          datas: {...persistedState.datas, ...newData},
          rows: [...persistedState.rows, ...newRows],
        };
      } else if (method === props.resetMethod) {
        return {
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
      let paste = '';
      const mapFn = row =>
        Object.keys(props.columns)
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

    renderSidebar = () => {
      const {renderSidebar} = props;
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
      const {columns, columnSizes} = props;
      const {rows} = this.props.persistedState;

      return (
        <FlexColumn grow={true}>
          <SearchableTable
            key={this.constructor.id}
            rowLineHeight={28}
            floating={false}
            multiline={true}
            columnSizes={columnSizes}
            columns={columns}
            onRowHighlighted={this.onRowHighlighted}
            multiHighlight={true}
            rows={rows}
            stickyBottom={true}
            actions={<Button onClick={this.clear}>Clear Table</Button>}
          />
          <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
        </FlexColumn>
      );
    }
  };
}
