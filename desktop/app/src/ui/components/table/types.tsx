/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Filter} from '../filter/types';
import {Property} from 'csstype';

export const MINIMUM_COLUMN_WIDTH = 100;
export const DEFAULT_COLUMN_WIDTH = 200;
export const DEFAULT_ROW_HEIGHT = 23;

export type TableColumnOrderVal = {
  key: string;
  visible: boolean;
};

export type TableColumnOrder = Array<TableColumnOrderVal>;

export type TableColumnSizes = {
  [key: string]: string | number;
};

export type TableHighlightedRows = Array<string>;

export type TableColumnKeys = Array<string>;

export type TableOnColumnResize = (id: string, size: number | string) => void;
export type TableOnColumnOrder = (order: TableColumnOrder) => void;
export type TableOnSort = (order: TableRowSortOrder) => void;
export type TableOnHighlight = (
  highlightedRows: TableHighlightedRows,
  e: React.UIEvent,
) => void;

export type TableHeaderColumn = {
  value: string;
  sortable?: boolean;
  resizable?: boolean;
};

export type TableBodyRow = {
  key: string;
  height?: number | undefined;
  filterValue?: string | undefined;
  backgroundColor?: string | undefined;
  sortKey?: string | number;
  style?: Object;
  type?: string | undefined;
  highlightedBackgroundColor?: Property.BackgroundColor | undefined;
  zebraBackgroundColor?: Property.BackgroundColor | undefined;
  onDoubleClick?: (e: React.MouseEvent) => void;
  copyText?: string | (() => string);
  getSearchContent?: () => string;
  highlightOnHover?: boolean;
  columns: {
    [key: string]: TableBodyColumn;
  };
};

export type TableBodyColumn = {
  sortValue?: string | number;
  isFilterable?: boolean;
  value: any;
  align?: 'left' | 'center' | 'right' | 'flex-start' | 'flex-end';
  title?: string;
};

export type TableColumns = {
  [key: string]: TableHeaderColumn;
};

export type TableRows = Array<TableBodyRow>;

export type TableRowSortOrder = {
  key: string;
  direction: 'up' | 'down';
};

export type TableOnDragSelect = (
  e: React.MouseEvent,
  key: string,
  index: number,
) => void;

export type TableOnAddFilter = (filter: Filter) => void;
