/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableColumnRawOrder,
  TableColumnKeys,
  TableColumnOrder,
  TableColumnSizes,
  TableColumns,
  TableHighlightedRows,
  TableOnColumnOrder,
  TableOnColumnResize,
  TableOnHighlight,
  TableOnSort,
  TableRowSortOrder,
  TableBodyRow,
  TableRows,
  TableOnAddFilter,
} from './types.js';
import {PureComponent} from 'react';
import FlexColumn from '../FlexColumn.js';
import TableHead from './TableHead.js';
import TableBody from './TableBody.js';
import FlexBox from '../FlexBox.js';
import createPaste from '../../../utils/createPaste.js';
import textContent from '../../../utils/textContent.js';
import {clipboard} from 'electron';

const TableInner = FlexColumn.extends(
  {
    minWidth: props => props.minWidth || '0',
    position: 'relative',
    width: '100%',
  },
  {
    ignoreAttributes: ['minWidth'],
  },
);

const TableOuter = FlexBox.extends(
  {
    width: '100%',
    backgroundColor: '#fff',
    border: props => (props.floating ? '1px solid #c9ced4' : 'none'),
    borderRadius: props => (props.floating ? 2 : 'none'),
    height: props => (props.autoHeight ? 'auto' : '100%'),
    overflow: props => (props.autoHeight ? 'visible' : 'auto'),
  },
  {
    ignoreAttributes: ['floating', 'autoHeight'],
  },
);

function getColumnOrder(
  colOrder: ?TableColumnRawOrder,
  cols: TableColumns,
): TableColumnOrder {
  // we have a specific column order, let's validate it
  if (colOrder) {
    const computedOrder = [];
    for (const obj of colOrder) {
      if (typeof obj === 'string') {
        computedOrder.push({key: obj, visible: true});
      } else {
        computedOrder.push(obj);
      }
    }
    return computedOrder;
  }

  // produce a column order
  const keys = Object.keys(cols);
  const computedOrder = [];
  for (const key of keys) {
    computedOrder.push({key, visible: true});
  }
  return computedOrder;
}

const sortedBodyCache: WeakMap<
  TableRows,
  {
    sortOrder: TableRowSortOrder,
    rows: TableRows,
  },
> = new WeakMap();
function getSortedRows(
  maybeSortOrder: ?TableRowSortOrder,
  rows: TableRows,
): TableRows {
  if (!maybeSortOrder) {
    return rows;
  }

  const sortOrder: TableRowSortOrder = maybeSortOrder;

  const cached = sortedBodyCache.get(rows);
  if (cached && cached.sortOrder === sortOrder) {
    return cached.rows;
  }

  let sortedRows = rows.sort((a, b) => {
    const aVal = a.columns[sortOrder.key].sortValue;
    const bVal = b.columns[sortOrder.key].sortValue;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    } else {
      throw new Error('Unsure how to sort this');
    }
  });

  if (sortOrder.direction === 'up') {
    sortedRows = sortedRows.reverse();
  }

  sortedBodyCache.set(rows, {
    rows: sortedRows,
    sortOrder,
  });

  return sortedRows;
}

const getRowsInRange = (
  from: string,
  to: string,
  rows: TableRows,
): TableHighlightedRows => {
  let fromFound = false;
  let toFound = false;
  const range = [];
  if (from === to) {
    return [from];
  }
  for (const {key} of rows) {
    if (key === from) {
      fromFound = true;
    } else if (key === to) {
      toFound = true;
    }

    if (fromFound && !toFound) {
      // range going downwards
      range.push(key);
    } else if (toFound && !fromFound) {
      // range going upwards
      range.unshift(key);
    } else if (fromFound && toFound) {
      // add last item
      if (key === from) {
        range.unshift(key);
      } else {
        range.push(key);
      }
      // we're done
      break;
    }
  }
  return range;
};

const filterRows = (
  rows: TableRows,
  filterValue: ?string,
  filter: ?(row: TableBodyRow) => boolean,
): TableRows => {
  // check that we don't have a filter
  const hasFilterValue = filterValue !== '' && filterValue != null;
  const hasFilter = hasFilterValue || typeof filter === 'function';
  if (!hasFilter) {
    return rows;
  }

  let filteredRows = [];

  if (hasFilter) {
    for (const row of rows) {
      let keep = false;

      // check if this row's filterValue contains the current filter
      if (filterValue != null && row.filterValue != null) {
        keep = row.filterValue.includes(filterValue);
      }

      // call filter() prop
      if (keep === false && typeof filter === 'function') {
        keep = filter(row);
      }

      if (keep) {
        filteredRows.push(row);
      }
    }
  } else {
    filteredRows = rows;
  }

  return filteredRows;
};

type TableProps = {|
  /**
   * Column definitions.
   */
  columns: TableColumns,
  /**
   * Row definitions.
   */
  rows: TableRows,

  /**
   * Minimum width of the table. If the table is sized smaller than this then
   * it's scrollable.
   */
  minWidth?: number,

  /**
   * Whether to use a virtual list. Items visible in the viewport are the only
   * included in the DOM. This can have a noticable performance improvement.
   */
  virtual?: boolean,
  /**
   * Whether the table has a border.
   */
  floating?: boolean,
  /**
   * Whether a row can span over multiple lines. Otherwise lines cannot wrap and
   * are truncated.
   */
  multiline?: boolean,
  /**
   * Height of each row.
   */
  rowLineHeight?: number,
  /**
   * Whether the body is scrollable. When this is set to `true` then the table
   * is not scrollable.
   */
  autoHeight?: boolean,
  /**
   * Highlighted rows.
   */
  highlightedRows?: ?TableHighlightedRows,
  /**
   * Callback when the highlighted rows change.
   */
  onHighlight?: ?TableOnHighlight,
  /**
   * Enable or disable zebra striping
   */
  zebra?: boolean,
  /**
   * Value to filter rows on. Alternative to the `filter` prop.
   */
  filterValue?: string,
  /**
   * Callback to filter rows.
   */
  filter?: (row: TableBodyRow) => boolean,

  /**
   * Sort order.
   */
  sortOrder?: ?TableRowSortOrder,
  /**
   * Callback when the sort order changes.
   */
  onSort?: ?TableOnSort,

  /**
   * Order of columns.
   */
  columnOrder?: ?TableColumnRawOrder,
  /**
   * Callback when a column is reordered or visibility changed.
   */
  onColumnOrder?: ?TableOnColumnOrder,

  /**
   * Size of the columns.
   */
  columnSizes?: ?TableColumnSizes,
  /**
   * Callback for when a column size changes.
   */
  onColumnResize?: ?TableOnColumnResize,
  /**
   * This makes it so the scroll position sticks to the bottom of the window.
   * Useful for streaming data like requests, logs etc.
   */
  stickyBottom?: ?boolean,
  /**
   * Used by SearchableTable to add filters for rows.
   */
  onAddFilter?: TableOnAddFilter,
  /**
   * Whether to hide the column names at the top of the table.
   */
  hideHeader?: boolean,
|};

type TableState = {
  columnOrder: TableColumnOrder,
  columnSizes: TableColumnSizes,
  columnKeys: TableColumnKeys,
  sortedRows: TableRows,
  dragStartingKey?: ?string,
};

const NO_COLUMN_SIZE: TableColumnSizes = {};

/**
 * A table component with all the native features you would expect.
 *
 *  - Row sorting
 *  - Row filtering
 *  - Row highlight
 *  - Row keyboard navigation
 *  - Column reordering
 *  - Column visibility
 *
 * This component is fairly low level. It's likely you're looking for
 * [`<ManagedTable>`]().
 */
export default class Table extends PureComponent<TableProps, TableState> {
  constructor(props: TableProps, context: Object) {
    super(props, context);
    this.state = this.deriveState(props);
  }

  static defaultProps = {
    floating: true,
    virtual: true,
  };

  componentDidMount() {
    // listning to mouseUp event on document to catch events even when
    // the cursor moved outside the table while dragging
    document.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  deriveState(props: TableProps): TableState {
    const columnSizes: TableColumnSizes = props.columnSizes || NO_COLUMN_SIZE;
    const columnOrder: TableColumnOrder = getColumnOrder(
      props.columnOrder,
      props.columns,
    );

    let columnKeys;
    if (this.state && this.state.columnOrder === columnOrder) {
      columnKeys = this.state.columnKeys;
    } else {
      columnKeys = [];
      for (const {key, visible} of columnOrder) {
        if (visible) {
          columnKeys.push(key);
        }
      }
    }

    let sortedRows = [];
    if (
      !this.state ||
      this.props.filter !== props.filter ||
      this.props.filterValue !== props.filterValue ||
      this.props.sortOrder !== props.sortOrder ||
      this.props.rows !== props.rows
    ) {
      // need to reorder or refilter the rows
      sortedRows = getSortedRows(
        props.sortOrder,
        filterRows(props.rows, props.filterValue, props.filter),
      );
    } else {
      sortedRows = this.state.sortedRows;
    }

    return {
      columnKeys,
      columnOrder,
      columnSizes,
      sortedRows,
    };
  }

  componentWillReceiveProps(nextProps: TableProps) {
    this.setState(this.deriveState(nextProps));
  }

  onMouseUp = () => this.setState({dragStartingKey: null});

  onKeyDown = (e: SyntheticKeyboardEvent<HTMLElement>) => {
    const {onHighlight, highlightedRows} = this.props;
    const {sortedRows} = this.state;
    const currentlyHighlightedRows = highlightedRows || [];
    let selectedRow: ?string;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentlyHighlightedRows.length === 0) {
        // no selection yet
        const index = e.key === 'ArrowUp' ? sortedRows.length - 1 : 0;
        selectedRow = sortedRows[index].key;
      } else {
        // determine sibling row to select
        const prevRowFinder = (row, index) =>
          index < sortedRows.length - 1
            ? sortedRows[index + 1].key ===
              currentlyHighlightedRows[currentlyHighlightedRows.length - 1]
            : false;

        const nextRowFinder = (row, index) =>
          index > 0
            ? sortedRows[index - 1].key ===
              currentlyHighlightedRows[currentlyHighlightedRows.length - 1]
            : false;

        const siblingRow = sortedRows.find(
          e.key === 'ArrowUp' ? prevRowFinder : nextRowFinder,
        );
        if (siblingRow) {
          selectedRow = siblingRow.key;
        }
      }

      if (onHighlight && selectedRow != null) {
        // scroll into view
        const index = sortedRows.findIndex(row => row.key === selectedRow);
        if (this.tableBodyRef && index) {
          this.tableBodyRef.scrollRowIntoView(index);
        }

        if (e.shiftKey) {
          onHighlight(
            currentlyHighlightedRows
              .filter(row => selectedRow !== row)
              .concat([selectedRow]),
            e,
          );
        } else {
          onHighlight([selectedRow], e);
        }
      }
    } else if (
      highlightedRows &&
      e.key === 'c' &&
      ((e.metaKey && process.platform === 'darwin') ||
        (e.ctrlKey && process.platform !== 'darwin'))
    ) {
      e.preventDefault();
      this.onCopyRows();
    }
  };

  getRowText = (): string => {
    const {highlightedRows} = this.props;
    const {sortedRows} = this.state;
    const visibleColums = this.state.columnOrder
      .filter(({visible}) => visible)
      .map(({key}) => key);

    const rows =
      !highlightedRows || highlightedRows.length === 0
        ? sortedRows
        : sortedRows.filter(row => highlightedRows.indexOf(row.key) > -1);

    return rows
      .map(
        row =>
          row.copyText != null
            ? row.copyText
            : visibleColums
                .map(col => textContent(row.columns[col].value))
                .filter(Boolean)
                .join('\t'),
      )
      .join('\n');
  };

  onCopyRows = () => {
    clipboard.writeText(this.getRowText());
  };

  onCreatePaste = () => {
    createPaste(this.getRowText());
  };

  onHighlight = (
    newHighlightedRows: TableHighlightedRows,
    e: SyntheticKeyboardEvent<*>,
  ) => {
    const {onHighlight, highlightedRows} = this.props;
    if (!onHighlight) {
      return;
    }
    if (e.shiftKey === true && highlightedRows && highlightedRows.length > 0) {
      const from = highlightedRows[highlightedRows.length - 1];
      const to = newHighlightedRows[0];
      const range = getRowsInRange(from, to, this.state.sortedRows);
      newHighlightedRows = highlightedRows
        .filter(key => range.indexOf(key) === -1)
        .concat(range);
    } else {
      this.setState({dragStartingKey: newHighlightedRows[0]});
    }

    onHighlight(newHighlightedRows, e);
  };

  onDragSelect = (e: SyntheticMouseEvent<>, key: string, index: number) => {
    const {dragStartingKey, sortedRows} = this.state;
    const {onHighlight} = this.props;
    if (dragStartingKey != null && onHighlight != null) {
      const range = getRowsInRange(dragStartingKey, key, this.state.sortedRows);
      if (this.tableBodyRef) {
        const startIndex = sortedRows.findIndex(
          row => row.key === dragStartingKey,
        );
        const nextIndex = startIndex < index ? index + 1 : index - 1;
        // only scroll one row every 100ms to not scroll to the end of the table immediatelly
        setTimeout(
          () =>
            this.tableBodyRef && this.tableBodyRef.scrollRowIntoView(nextIndex),
          100,
        );
      }
      onHighlight(range, e);
    }
  };

  scrollToBottom() {
    const {tableBodyRef} = this;
    if (tableBodyRef) {
      tableBodyRef.scrollToBottom();
    }
  }

  tableBodyRef: ?TableBody;

  setTableBodyRef = (ref: ?TableBody) => {
    this.tableBodyRef = ref;
  };

  render() {
    const {props, state} = this;

    const tableHead =
      props.hideHeader === true ? null : (
        <TableHead
          columnOrder={state.columnOrder}
          onColumnOrder={props.onColumnOrder}
          columnKeys={state.columnKeys}
          columns={props.columns}
          sortOrder={props.sortOrder}
          onSort={props.onSort}
          columnSizes={state.columnSizes}
          onColumnResize={props.onColumnResize}
        />
      );

    return (
      <TableOuter
        floating={props.floating}
        autoHeight={props.autoHeight}
        onKeyDown={this.onKeyDown}
        tabIndex={0}>
        <TableInner minWidth={props.minWidth}>
          {tableHead}

          <TableBody
            ref={this.setTableBodyRef}
            virtual={props.virtual}
            filter={props.filter}
            filterValue={props.filterValue}
            autoHeight={props.autoHeight}
            rowLineHeight={props.rowLineHeight}
            multiline={props.multiline}
            onHighlight={this.onHighlight}
            highlightedRows={props.highlightedRows}
            columnKeys={state.columnKeys}
            rows={state.sortedRows}
            columnSizes={state.columnSizes}
            stickyBottom={props.stickyBottom}
            isDragging={Boolean(state.dragStartingKey)}
            zebra={props.zebra}
            onDragSelect={this.onDragSelect}
            onCopyRows={this.onCopyRows}
            onCreatePaste={this.onCreatePaste}
            onAddFilter={props.onAddFilter}
          />
        </TableInner>
      </TableOuter>
    );
  }
}
