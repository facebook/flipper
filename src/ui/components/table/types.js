/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Filter} from '../filter/types.js';

export const MINIMUM_COLUMN_WIDTH = 100;
export const DEFAULT_COLUMN_WIDTH = 200;
export const DEFAULT_ROW_HEIGHT = 23;

export type TableColumnOrderVal = {
  key: string,
  visible: boolean,
};

export type TableColumnOrder = Array<TableColumnOrderVal>;

export type TableColumnSizes = {
  [key: string]: string | number,
};

export type TableHighlightedRows = Array<string>;

export type TableColumnKeys = Array<string>;

export type TableOnColumnResize = (sizes: TableColumnSizes) => void;
export type TableOnColumnOrder = (order: TableColumnOrder) => void;
export type TableOnSort = (order: TableRowSortOrder) => void;
export type TableOnHighlight = (
  highlightedRows: TableHighlightedRows,
  e: SyntheticUIEvent<>,
) => void;

export type TableHeaderColumn = {|
  value: string,
  sortable?: boolean,
  resizable?: boolean,
|};

export type TableBodyRow = {|
  key: string,
  height?: ?number,
  filterValue?: ?string,
  backgroundColor?: ?string,
  sortKey?: string | number,
  style?: Object,
  type?: ?string,
  highlightedBackgroundColor?: ?string,
  onDoubleClick?: (e: SyntheticMouseEvent<>) => void,
  copyText?: string,
  highlightOnHover?: boolean,
  columns: {
    [key: string]: TableBodyColumn,
  },
|};

export type TableBodyColumn = {|
  sortValue?: string | number,
  isFilterable?: boolean,
  value: any,
  align?: 'left' | 'center' | 'right',
  title?: string,
|};

export type TableColumns = {
  [key: string]: TableHeaderColumn,
};

export type TableRows = Array<TableBodyRow>;

export type TableRowSortOrder = {|
  key: string,
  direction: 'up' | 'down',
|};

export type TableOnDragSelect = (
  e: SyntheticMouseEvent<>,
  key: string,
  index: number,
) => void;

export type TableOnAddFilter = (filter: Filter) => void;
