/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableColumnOrder,
  TableColumnSizes,
  TableColumns,
  TableHighlightedRows,
  TableRowSortOrder,
  TableRows,
  TableBodyRow,
  TableOnAddFilter,
} from './types.js';

import React from 'react';
import styled from '../../styled/index.js';
import AutoSizer from 'react-virtualized-auto-sizer';
import {VariableSizeList as List} from 'react-window';
import {clipboard} from 'electron';
import TableHead from './TableHead.js';
import TableRow from './TableRow.js';
import ContextMenu from '../ContextMenu.js';
import FlexColumn from '../FlexColumn.js';
import createPaste from '../../../utils/createPaste.js';
import debounceRender from 'react-debounce-render';
import debounce from 'lodash.debounce';
import {DEFAULT_ROW_HEIGHT} from './types';

export type ManagedTableProps = {|
  /**
   * Column definitions.
   */
  columns: TableColumns,
  /**
   * Row definitions.
   */
  rows: TableRows,
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
   * Whether the body is scrollable. When this is set to `true` then the table
   * is not scrollable.
   */
  autoHeight?: boolean,
  /**
   * Order of columns.
   */
  columnOrder?: TableColumnOrder,
  /**
   * Size of the columns.
   */
  columnSizes?: TableColumnSizes,
  /**
   * Value to filter rows on. Alternative to the `filter` prop.
   */
  filterValue?: string,
  /**
   * Callback to filter rows.
   */
  filter?: (row: TableBodyRow) => boolean,
  /**
   * Callback when the highlighted rows change.
   */
  onRowHighlighted?: (keys: TableHighlightedRows) => void,
  /**
   * Whether rows can be highlighted or not.
   */
  highlightableRows?: boolean,
  /**
   * Whether multiple rows can be highlighted or not.
   */
  multiHighlight?: boolean,
  /**
   * Height of each row.
   */
  rowLineHeight?: number,
  /**
   * This makes it so the scroll position sticks to the bottom of the window.
   * Useful for streaming data like requests, logs etc.
   */
  stickyBottom?: boolean,
  /**
   * Used by SearchableTable to add filters for rows
   */
  onAddFilter?: TableOnAddFilter,
  /**
   * Enable or disable zebra striping
   */
  zebra?: boolean,
  /**
   * Whether to hide the column names at the top of the table.
   */
  hideHeader?: boolean,
|};

type ManagedTableState = {|
  highlightedRows: Set<string>,
  sortOrder: ?TableRowSortOrder,
  columnOrder: TableColumnOrder,
  columnSizes: TableColumnSizes,
  shouldScrollToBottom: boolean,
|};

/**
 * Wrapper around `Table` that handles row state.
 *
 * If you require lower level access to the state then use [`<Table>`]()
 * directly.
 */
class ManagedTable extends styled.StylableComponent<
  ManagedTableProps,
  ManagedTableState,
> {
  getTableKey = (): string => {
    return (
      'TABLE_COLUMNS_' +
      Object.keys(this.props.columns)
        .join('_')
        .toUpperCase()
    );
  };

  state: ManagedTableState = {
    columnOrder:
      JSON.parse(window.localStorage.getItem(this.getTableKey()) || 'null') ||
      this.props.columnOrder ||
      Object.keys(this.props.columns).map(key => ({key, visible: true})),
    columnSizes: this.props.columnSizes || {},
    highlightedRows: new Set(),
    sortOrder: null,
    shouldScrollToBottom: Boolean(this.props.stickyBottom),
  };

  tableRef: {
    current: null | List,
  } = React.createRef();
  scrollRef: {
    current: null | HTMLDivElement,
  } = React.createRef();
  dragStartIndex: ?number = null;

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  componentWillReceiveProps(nextProps: ManagedTableProps) {
    // if columnSizes has changed
    if (nextProps.columnSizes !== this.props.columnSizes) {
      this.setState({
        columnSizes: {
          ...(this.state.columnSizes || {}),
          ...nextProps.columnSizes,
        },
      });
    }

    // if columnOrder has changed
    if (nextProps.columnOrder !== this.props.columnOrder) {
      this.setState({
        columnOrder: nextProps.columnOrder,
      });
    }

    if (
      nextProps.filter !== this.props.filter &&
      this.tableRef &&
      this.tableRef.current
    ) {
      // rows were filtered, we need to recalculate heights
      this.tableRef.current.resetAfterIndex(0);
    }
  }

  componentDidUpdate(prevProps: ManagedTableProps) {
    if (
      this.props.rows.length !== prevProps.rows.length &&
      this.state.shouldScrollToBottom &&
      this.state.highlightedRows.size < 2
    ) {
      this.scrollToBottom();
    }
  }

  onCopy = () => {
    clipboard.writeText(this.getSelectedText());
  };

  onKeyDown = (e: KeyboardEvent) => {
    const {highlightedRows} = this.state;
    if (highlightedRows.size === 0) {
      return;
    }
    if (
      ((e.metaKey && process.platform === 'darwin') ||
        (e.ctrlKey && process.platform !== 'darwin')) &&
      e.keyCode === 67
    ) {
      this.onCopy();
    } else if (e.keyCode === 38 || e.keyCode === 40) {
      // arrow navigation
      const {rows} = this.props;
      const {highlightedRows} = this.state;
      const lastItemKey = Array.from(this.state.highlightedRows).pop();
      const lastItemIndex = this.props.rows.findIndex(
        row => row.key === lastItemKey,
      );
      const newIndex = Math.min(
        rows.length - 1,
        Math.max(0, e.keyCode === 38 ? lastItemIndex - 1 : lastItemIndex + 1),
      );
      if (!e.shiftKey) {
        highlightedRows.clear();
      }
      highlightedRows.add(rows[newIndex].key);
      this.setState({highlightedRows}, () => {
        const {current} = this.tableRef;
        if (current) {
          current.scrollToItem(newIndex);
        }
      });
    }
  };

  onSort = (sortOrder: TableRowSortOrder) => {
    this.setState({sortOrder});
  };

  onColumnOrder = (columnOrder: TableColumnOrder) => {
    this.setState({columnOrder});
    // persist column order
    window.localStorage.setItem(
      this.getTableKey(),
      JSON.stringify(columnOrder),
    );
  };

  onColumnResize = (columnSizes: TableColumnSizes) => {
    this.setState({columnSizes});
  };

  scrollToBottom() {
    const {current} = this.tableRef;
    if (current && this.props.rows.length > 1) {
      current.scrollToItem(this.props.rows.length - 1);
    }
  }

  onHighlight = (
    e: SyntheticMouseEvent<>,
    row: TableBodyRow,
    index: number,
  ) => {
    if (e.button !== 0) {
      // Only highlight rows when using primary mouse button,
      // otherwise do nothing, to not interfere context menus.
      return;
    }
    if (e.shiftKey) {
      // prevents text selection
      e.preventDefault();
    }

    let {highlightedRows} = this.state;

    this.dragStartIndex = index;
    document.addEventListener('mouseup', this.onStopDragSelecting);

    if (
      (e.metaKey && process.platform === 'darwin') ||
      (e.ctrlKey && process.platform !== 'darwin')
    ) {
      highlightedRows.add(row.key);
    } else if (e.shiftKey) {
      // range select
      const lastItemKey = Array.from(this.state.highlightedRows).pop();
      highlightedRows = new Set([
        ...highlightedRows,
        ...this.selectInRange(lastItemKey, row.key),
      ]);
    } else {
      // single select
      this.state.highlightedRows.clear();
      this.state.highlightedRows.add(row.key);
    }

    this.setState({highlightedRows});
  };

  onStopDragSelecting = () => {
    this.dragStartIndex = null;
    document.removeEventListener('mouseup', this.onStopDragSelecting);
  };

  selectInRange = (fromKey: string, toKey: string): Array<string> => {
    const selected = [];
    let startIndex = -1;
    let endIndex = -1;
    for (let i = 0; i < this.props.rows.length; i++) {
      if (this.props.rows[i].key === fromKey) {
        startIndex = i;
      }
      if (this.props.rows[i].key === toKey) {
        endIndex = i;
      }
      if (endIndex > -1 && startIndex > -1) {
        break;
      }
    }

    for (
      let i = Math.min(startIndex, endIndex);
      i <= Math.max(startIndex, endIndex);
      i++
    ) {
      try {
        selected.push(this.props.rows[i].key);
      } catch (e) {}
    }

    return selected;
  };

  onMouseEnterRow = (
    e: SyntheticMouseEvent<>,
    row: TableBodyRow,
    index: number,
  ) => {
    const {dragStartIndex} = this;
    const {current} = this.tableRef;
    if (dragStartIndex && current) {
      current.scrollToItem(index + 1);
      const startKey = this.props.rows[dragStartIndex].key;
      const highlightedRows = new Set(this.selectInRange(startKey, row.key));
      this.setState({
        highlightedRows,
      });
    }
  };

  buildContextMenuItems = () => {
    const {highlightedRows} = this.state;
    if (highlightedRows.size === 0) {
      return [];
    }

    return [
      {
        label:
          highlightedRows.size > 1
            ? `Copy ${highlightedRows.size} rows`
            : 'Copy row',
        click: this.onCopy,
      },
      {
        label: 'Create Paste',
        click: () => createPaste(this.getSelectedText()),
      },
    ];
  };

  getSelectedText = (): string => {
    const {highlightedRows} = this.state;

    if (highlightedRows.size === 0) {
      return '';
    }
    return this.props.rows
      .filter(row => highlightedRows.has(row.key))
      .map(
        (row: TableBodyRow) =>
          row.copyText ||
          Array.from(
            document.querySelectorAll(`[data-key='${row.key}'] > *`) || [],
          )
            .map(node => node.textContent)
            .join('\t'),
      )
      .join('\n');
  };

  onScroll = debounce(
    ({
      scrollDirection,
      scrollOffset,
    }: {
      scrollDirection: 'forward' | 'backward',
      scrollOffset: number,
      scrollUpdateWasRequested: boolean,
    }) => {
      const {current} = this.scrollRef;
      const parent = current ? current.parentElement : null;
      if (
        this.props.stickyBottom &&
        scrollDirection === 'forward' &&
        !this.state.shouldScrollToBottom &&
        current &&
        parent instanceof HTMLElement &&
        current.offsetHeight - (scrollOffset + parent.offsetHeight) <
          parent.offsetHeight
      ) {
        this.setState({shouldScrollToBottom: true});
      } else if (
        this.props.stickyBottom &&
        scrollDirection === 'backward' &&
        this.state.shouldScrollToBottom
      ) {
        this.setState({shouldScrollToBottom: false});
      }
    },
    100,
  );

  render() {
    const {
      onAddFilter,
      columns,
      multiline,
      zebra,
      rows,
      rowLineHeight,
    } = this.props;

    const {columnOrder, columnSizes, highlightedRows} = this.state;
    const columnKeys = columnOrder
      .map(k => (k.visible ? k.key : null))
      .filter(Boolean);

    return (
      <FlexColumn style={{flexGrow: 1}}>
        <TableHead
          columnOrder={columnOrder}
          onColumnOrder={this.onColumnOrder}
          columns={columns}
          onColumnResize={this.onColumnResize}
          sortOrder={this.state.sortOrder}
          columnSizes={columnSizes}
          onSort={this.onSort}
        />
        <FlexColumn
          style={{
            flexGrow: 1,
          }}>
          <AutoSizer>
            {({width, height}) => (
              <ContextMenu buildItems={this.buildContextMenuItems}>
                <List
                  itemCount={rows.length}
                  itemSize={index =>
                    (rows[index] && rows[index].height) ||
                    rowLineHeight ||
                    DEFAULT_ROW_HEIGHT
                  }
                  ref={this.tableRef}
                  width={width}
                  estimatedItemSize={rowLineHeight || DEFAULT_ROW_HEIGHT}
                  overscanCount={5}
                  innerRef={this.scrollRef}
                  onScroll={this.onScroll}
                  height={height}>
                  {({index, style}) => (
                    <TableRow
                      key={rows[index].key}
                      columnSizes={columnSizes}
                      columnKeys={columnKeys}
                      onMouseDown={e => this.onHighlight(e, rows[index], index)}
                      onMouseEnter={e =>
                        this.onMouseEnterRow(e, rows[index], index)
                      }
                      multiline={multiline}
                      rowLineHeight={24}
                      highlighted={highlightedRows.has(rows[index].key)}
                      row={rows[index]}
                      index={index}
                      style={style}
                      onAddFilter={onAddFilter}
                      zebra={zebra}
                    />
                  )}
                </List>
              </ContextMenu>
            )}
          </AutoSizer>
        </FlexColumn>
      </FlexColumn>
    );
  }
}

export default debounceRender(ManagedTable, 150, {maxTime: 200});
