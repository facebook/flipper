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
} from 'sonar';
import {FlexColumn, Button, SonarSidebar} from 'sonar';
import textContent from './utils/textContent.js';
import createPaste from './utils/createPaste.js';
import {SonarPlugin, SearchableTable} from 'sonar';

type ID = string;

type RowData = {
  id: ID,
};

type Props<T> = {|
  title: string,
  id: string,
  icon: string,
  method: string,
  resetMethod?: string,
  columns: TableColumns,
  columnSizes: TableColumnSizes,
  renderSidebar: (row: T) => any,
  buildRow: (row: T) => any,
|};

type State<T> = {|
  rows: TableRows,
  datas: {[key: ID]: T},
  selectedIds: Array<ID>,
|};

type AppendAndUpdateAction<T> = {|type: 'AppendAndUpdate', datas: Array<T>|};
type ResetAndUpdateAction<T> = {|type: 'ResetAndUpdate', datas: Array<T>|};
type Actions<T> = AppendAndUpdateAction<T> | ResetAndUpdateAction<T>;

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
 * data provided. This is useful when connecting to sonar for this first time, or reconnecting to
 * the client in an unknown state.
 */
export function createTablePlugin<T: RowData>(props: Props<T>) {
  return class extends SonarPlugin<State<T>, Actions<T>> {
    static title = props.title;
    static id = props.id;
    static icon = props.icon;
    static keyboardActions = ['clear', 'createPaste'];

    state = {
      rows: [],
      datas: {},
      selectedIds: [],
    };

    onKeyboardAction = (action: string) => {
      if (action === 'clear') {
        this.clear();
      } else if (action === 'createPaste') {
        this.createPaste();
      }
    };

    reducers = {
      AppendAndUpdate(state: State<T>, action: AppendAndUpdateAction<T>) {
        const newRows = [];
        const newData = {};

        for (const data of action.datas.reverse()) {
          if (data.id == null) {
            console.warn('The data sent did not contain an ID.');
          }
          if (this.state.datas[data.id] == null) {
            newData[data.id] = data;
            newRows.push(props.buildRow(data));
          }
        }
        return {
          datas: {...state.datas, ...newData},
          rows: [...state.rows, ...newRows],
        };
      },
      ResetAndUpdate(state: State<T>, action: ResetAndUpdateAction<T>) {
        const newRows = [];
        const newData = {};

        for (const data of action.datas.reverse()) {
          if (data.id == null) {
            console.warn('The data sent did not contain an ID.');
          }
          if (this.state.datas[data.id] == null) {
            newData[data.id] = data;
            newRows.push(props.buildRow(data));
          }
        }
        return {
          datas: newData,
          rows: newRows,
        };
      },
    };

    init() {
      this.client.subscribe(props.method, (data: T | Array<T>) => {
        this.dispatchAction({
          type: 'AppendAndUpdate',
          datas: data instanceof Array ? data : [data],
        });
      });
      if (props.resetMethod) {
        this.client.subscribe(props.resetMethod, (data: Array<T>) => {
          this.dispatchAction({
            type: 'ResetAndUpdate',
            datas: data instanceof Array ? data : [],
          });
        });
      }
    }

    clear = () => {
      this.setState({
        datas: {},
        rows: [],
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
        paste = this.state.rows
          .filter(row => this.state.selectedIds.indexOf(row.key) > -1)
          .map(mapFn)
          .join('\n');
      } else {
        // create paste with all rows
        paste = this.state.rows.map(mapFn).join('\n');
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
      const {datas, selectedIds} = this.state;
      const selectedId = selectedIds.length !== 1 ? null : selectedIds[0];

      if (selectedId != null) {
        return renderSidebar(datas[selectedId]);
      } else {
        return null;
      }
    };

    render() {
      const {columns, columnSizes} = props;
      const {rows} = this.state;

      return (
        <FlexColumn fill={true}>
          <SearchableTable
            key={props.id}
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
          <SonarSidebar>{this.renderSidebar()}</SonarSidebar>
        </FlexColumn>
      );
    }
  };
}
