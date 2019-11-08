/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  TableHighlightedRows,
  TableRows_immutable,
  TableColumnSizes,
  TableColumns,
} from 'flipper';
import FlexColumn from './ui/components/FlexColumn';
import Button from './ui/components/Button';
import DetailSidebar from './chrome/DetailSidebar';
import {FlipperPlugin} from './plugin';
import SearchableTable_immutable from './ui/components/searchable/SearchableTable_immutable';
import textContent from './utils/textContent';
import createPaste from './fb-stubs/createPaste';
import {List, Map as ImmutableMap} from 'immutable';
import React from 'react';
import {KeyboardActions} from './MenuBar';
import {TableBodyRow} from './ui';
import {Idler} from './utils/Idler';

type ID = string;

export interface RowData {
  id: ID;
}

type Props<T> = {
  method: string;
  resetMethod?: string;
  columns: TableColumns;
  columnSizes: TableColumnSizes;
  renderSidebar: (row: T) => any;
  buildRow: (row: T) => any;
};

export type PersistedState<T> = {
  rows: TableRows_immutable;
  datas: ImmutableMap<ID, T>;
};

type State = {
  selectedIds: Array<ID>;
};

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
export function createTablePlugin<T extends RowData>(props: Props<T>) {
  return class extends FlipperPlugin<State, any, PersistedState<T>> {
    static keyboardActions: KeyboardActions = ['clear', 'createPaste'];

    static defaultPersistedState = {
      rows: List(),
      datas: ImmutableMap<ID, T>(),
    };

    static persistedStateReducer = (
      persistedState: PersistedState<T>,
      method: string,
      payload: T | Array<T>,
    ): Partial<PersistedState<T>> => {
      if (method === props.method) {
        return List(Array.isArray(payload) ? payload : [payload]).reduce(
          (ps: PersistedState<any>, data: T) => {
            if (data.id == null) {
              console.warn('The data sent did not contain an ID.', data);
            }
            return {
              datas: ps.datas.set(data.id, data),
              rows: ps.rows.push(props.buildRow(data)),
            };
          },
          persistedState,
        );
      } else if (method === props.resetMethod) {
        return {
          rows: List(),
          datas: ImmutableMap(),
        };
      } else {
        return {};
      }
    };

    static serializePersistedState: (
      persistedState: PersistedState<T>,
      statusUpdate?: (msg: string) => void,
      idler?: Idler,
      pluginName?: string,
    ) => Promise<string> = async (
      persistedState: PersistedState<T>,
      _statusUpdate?: (msg: string) => void,
      _idler?: Idler,
      _pluginName?: string,
    ) => {
      const serializable = {
        rows: persistedState.rows,
        datas: persistedState.datas.toArray(),
      };
      return JSON.stringify(serializable);
    };

    static deserializePersistedState: (
      serializedString: string,
    ) => PersistedState<T> = (serializedString: string) => {
      const parse = JSON.parse(serializedString);
      return {
        rows: List(parse.rows) as TableRows_immutable,
        datas: ImmutableMap(parse.datas) as ImmutableMap<ID, T>,
      };
    };

    state: State = {
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
        rows: List(),
        datas: ImmutableMap(),
      });
      this.setState({
        selectedIds: [],
      });
    };

    createPaste = () => {
      let paste = '';
      const mapFn = (row: TableBodyRow) =>
        Object.keys(props.columns)
          .map(key => textContent(row.columns[key].value))
          .join('\t');

      if (this.state.selectedIds.length > 0) {
        // create paste from selection
        paste = this.props.persistedState.rows
          .filter(
            (row: TableBodyRow) => this.state.selectedIds.indexOf(row.key) > -1,
          )
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
        const data = datas.get(selectedId);
        return data != null ? renderSidebar(data) : null;
      } else {
        return null;
      }
    };

    render() {
      const {columns, columnSizes} = props;
      const {rows} = this.props.persistedState;
      return (
        <FlexColumn grow={true}>
          <SearchableTable_immutable
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
