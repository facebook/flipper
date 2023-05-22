/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  TableColumnOrder,
  TableColumnSizes,
  TableColumns,
  TableHighlightedRows,
  TableRowSortOrder,
  TableRows,
  TableBodyRow,
  TableOnAddFilter,
} from './types';
import {ContextMenuItem, MenuTemplate} from '../ContextMenu';
import React from 'react';
import styled from '@emotion/styled';
import AutoSizer from 'react-virtualized-auto-sizer';
import {VariableSizeList as List} from 'react-window';
import TableHead from './TableHead';
import TableRow from './TableRow';
import ContextMenu from '../ContextMenu';
import FlexColumn from '../FlexColumn';
import createPaste from '../../../fb-stubs/createPaste';
import debounceRender from 'react-debounce-render';
import {debounce} from 'lodash';
import {DEFAULT_ROW_HEIGHT} from './types';
import {notNull} from '../../../utils/typeUtils';
import {getFlipperLib, textContent} from 'flipper-plugin';
import {getRenderHostInstance} from 'flipper-frontend-core';

const EMPTY_OBJECT = {};
Object.freeze(EMPTY_OBJECT);

export type ManagedTableProps = {
  /**
   * Column definitions.
   */
  columns: TableColumns;
  /**
   * Row definitions.
   */
  rows: TableRows;
  /*
   * Globally unique key for persisting data between uses of a table such as column sizes.
   */
  tableKey?: string;
  /**
   * Whether the table has a border.
   */
  floating?: boolean;
  /**
   * Whether a row can span over multiple lines. Otherwise lines cannot wrap and
   * are truncated.
   */
  multiline?: boolean;
  /**
   * Whether the body is scrollable. When this is set to `true` then the table
   * is not scrollable.
   */
  autoHeight?: boolean;
  /**
   * Order of columns.
   */
  columnOrder?: TableColumnOrder;
  /**
   * Initial size of the columns.
   */
  columnSizes?: TableColumnSizes;
  /**
   * Value to filter rows on. Alternative to the `filter` prop.
   */
  filterValue?: string;
  /**
   * Callback to filter rows.
   */
  filter?: (row: TableBodyRow) => boolean;
  /**
   * Callback when the highlighted rows change.
   */
  onRowHighlighted?: (keys: TableHighlightedRows) => void;
  /**
   * Whether rows can be highlighted or not.
   */
  highlightableRows?: boolean;
  /**
   * Whether multiple rows can be highlighted or not.
   */
  multiHighlight?: boolean;
  /**
   * Height of each row.
   */
  rowLineHeight?: number;
  /**
   * This makes it so the scroll position sticks to the bottom of the window.
   * Useful for streaming data like requests, logs etc.
   */
  stickyBottom?: boolean;
  /**
   * Used by SearchableTable to add filters for rows.
   */
  onAddFilter?: TableOnAddFilter;
  /**
   * Enable or disable zebra striping.
   */
  zebra?: boolean;
  /**
   * Whether to hide the column names at the top of the table.
   */
  hideHeader?: boolean;
  /**
   * Rows that are highlighted initially.
   */
  highlightedRows?: Set<string>;
  /**
   * Allows to create context menu items for rows.
   */
  buildContextMenuItems?: () => MenuTemplate;
  /**
   * Callback when sorting changes.
   */
  onSort?: (order: TableRowSortOrder) => void;
  /**
   * Initial sort order of the table.
   */
  initialSortOrder?: TableRowSortOrder;
  /**
   * Table scroll horizontally, if needed
   */
  horizontallyScrollable?: boolean;
  /**
   * Whether to allow navigation via arrow keys. Default: true
   */
  enableKeyboardNavigation?: boolean;
  /**
   * Reference to the managed table.
   */
  innerRef?:
    | React.MutableRefObject<ManagedTable | undefined>
    | ((ref: ManagedTable | undefined) => void);
};

type ManagedTableState = {
  highlightedRows: Set<string>;
  sortOrder?: TableRowSortOrder;
  columnOrder: TableColumnOrder;
  columnKeys: string[];
  columnSizes: TableColumnSizes;
  shouldScrollToBottom: boolean;
};

const Container = styled(FlexColumn)<{canOverflow?: boolean}>((props) => ({
  overflow: props.canOverflow ? 'scroll' : 'visible',
  flexGrow: 1,
  height: '100%',
}));
Container.displayName = 'ManagedTable:Container';

const globalTableState: {[key: string]: TableColumnSizes} = {};

export class ManagedTable extends React.Component<
  ManagedTableProps,
  ManagedTableState
> {
  static defaultProps = {
    highlightableRows: true,
    multiHighlight: false,
    autoHeight: false,
    enableKeyboardNavigation: true,
  };

  getTableKey = (): string => {
    return (
      'TABLE_COLUMNS_' + Object.keys(this.props.columns).join('_').toUpperCase()
    );
  };

  tableRef = React.createRef<List>();

  scrollRef: {
    current: null | HTMLDivElement;
  } = React.createRef();

  dragStartIndex: number | null = null;

  // We want to call scrollToHighlightedRows on componentDidMount. However, at
  // this time, tableRef is still null, because AutoSizer needs one render to
  // measure the size of the table. This is why we are using this flag to
  // trigger actions on the first update instead.
  firstUpdate = true;

  constructor(props: ManagedTableProps) {
    super(props);
    const columnOrder =
      JSON.parse(window.localStorage.getItem(this.getTableKey()) || 'null') ||
      this.props.columnOrder ||
      Object.keys(this.props.columns).map((key) => ({key, visible: true}));
    this.state = {
      columnOrder,
      columnKeys: this.computeColumnKeys(columnOrder, this.props.columns),
      columnSizes:
        this.props.tableKey && globalTableState[this.props.tableKey]
          ? globalTableState[this.props.tableKey]
          : this.props.columnSizes || {},
      highlightedRows: this.props.highlightedRows || new Set(),
      sortOrder: this.props.initialSortOrder || undefined,
      shouldScrollToBottom: Boolean(this.props.stickyBottom),
    };
  }

  componentDidMount() {
    if (typeof this.props.innerRef === 'function') {
      this.props.innerRef(this);
    } else if (this.props.innerRef) {
      this.props.innerRef.current = this;
    }
  }

  componentWillUnmount() {
    if (typeof this.props.innerRef === 'function') {
      this.props.innerRef(undefined);
    } else if (this.props.innerRef) {
      this.props.innerRef.current = undefined;
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps: ManagedTableProps) {
    // if columnSizes has changed
    if (nextProps.columnSizes !== this.props.columnSizes) {
      this.setState({
        columnSizes: {
          ...(this.state.columnSizes || {}),
          ...nextProps.columnSizes,
        },
      });
    }

    if (this.props.highlightedRows !== nextProps.highlightedRows) {
      this.setState({highlightedRows: nextProps.highlightedRows || new Set()});
    }

    // if columnOrder has changed
    if (
      nextProps.columnOrder !== this.props.columnOrder &&
      nextProps.columnOrder
    ) {
      if (this.tableRef && this.tableRef.current) {
        this.tableRef.current.resetAfterIndex(0, true);
      }
      this.setState({
        columnOrder: nextProps.columnOrder,
        columnKeys: this.computeColumnKeys(
          nextProps.columnOrder,
          this.props.columns,
        ),
      });
    }

    if (
      this.props.rows.length > nextProps.rows.length &&
      this.tableRef &&
      this.tableRef.current
    ) {
      // rows were filtered, we need to recalculate heights
      this.tableRef.current.resetAfterIndex(0, true);
    }
  }

  componentDidUpdate(
    prevProps: ManagedTableProps,
    prevState: ManagedTableState,
  ) {
    if (
      this.props.stickyBottom !== false &&
      this.props.rows.length !== prevProps.rows.length &&
      this.state.shouldScrollToBottom &&
      this.state.highlightedRows.size < 2
    ) {
      this.scrollToBottom();
    } else if (
      prevState.highlightedRows !== this.state.highlightedRows ||
      this.firstUpdate
    ) {
      this.scrollToHighlightedRows();
    }
    if (
      this.props.stickyBottom &&
      !this.state.shouldScrollToBottom &&
      this.scrollRef &&
      this.scrollRef.current &&
      this.scrollRef.current.parentElement &&
      this.scrollRef.current.parentElement instanceof HTMLElement &&
      this.scrollRef.current.offsetHeight <=
        this.scrollRef.current.parentElement.offsetHeight
    ) {
      this.setState({shouldScrollToBottom: true});
    }
    this.firstUpdate = false;
  }

  computeColumnKeys(columnOrder: TableColumnOrder, columns: TableColumns) {
    return columnOrder
      .map((k) =>
        k.visible && Object.keys(columns).includes(k.key) ? k.key : null,
      )
      .filter(notNull);
  }

  scrollToHighlightedRows = () => {
    const {current} = this.tableRef;
    const {highlightedRows} = this.state;
    if (current && highlightedRows && highlightedRows.size > 0) {
      const highlightedRow = Array.from(highlightedRows)[0];
      const index = this.props.rows.findIndex(
        ({key}) => key === highlightedRow,
      );
      if (index >= 0) {
        current.scrollToItem(index);
      }
    }
  };

  onCopy = (withHeader: boolean) => {
    getFlipperLib().writeTextToClipboard(
      [
        ...(withHeader ? [this.getHeaderText()] : []),
        this.getSelectedText(),
      ].join('\n'),
    );
  };

  onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const {highlightedRows} = this.state;
    const {platform} = getRenderHostInstance().serverConfig.environmentInfo.os;
    if (highlightedRows.size === 0) {
      return;
    }
    if (
      ((e.metaKey && platform === 'darwin') ||
        (e.ctrlKey && platform !== 'darwin')) &&
      e.keyCode === 67
    ) {
      e.stopPropagation();
      this.onCopy(false);
    } else if (
      (e.keyCode === 38 || e.keyCode === 40) &&
      this.props.highlightableRows &&
      this.props.enableKeyboardNavigation
    ) {
      e.stopPropagation();
      // arrow navigation
      const {rows} = this.props;
      const {highlightedRows} = this.state;
      const lastItemKey = Array.from(this.state.highlightedRows).pop();
      const lastItemIndex = this.props.rows.findIndex(
        (row) => row.key === lastItemKey,
      );
      const newIndex = Math.min(
        rows.length - 1,
        Math.max(0, e.keyCode === 38 ? lastItemIndex - 1 : lastItemIndex + 1),
      );
      if (!e.shiftKey) {
        highlightedRows.clear();
      }
      highlightedRows.add(rows[newIndex].key);
      this.onRowHighlighted(highlightedRows, () => {
        const {current} = this.tableRef;
        if (current) {
          current.scrollToItem(newIndex);
        }
      });
    }
  };

  onRowHighlighted = (highlightedRows: Set<string>, cb?: () => void) => {
    if (!this.props.highlightableRows) {
      return;
    }
    this.setState({highlightedRows}, cb);
    const {onRowHighlighted} = this.props;
    if (onRowHighlighted) {
      onRowHighlighted(Array.from(highlightedRows));
    }
  };

  onSort = (sortOrder: TableRowSortOrder) => {
    this.setState({sortOrder});
    this.props.onSort && this.props.onSort(sortOrder);
  };

  onColumnOrder = (columnOrder: TableColumnOrder) => {
    this.setState({columnOrder});
    // persist column order
    window.localStorage.setItem(
      this.getTableKey(),
      JSON.stringify(columnOrder),
    );
  };

  onColumnResize = (id: string, width: number | string) => {
    this.setState(({columnSizes}) => ({
      columnSizes: {
        ...columnSizes,
        [id]: width,
      },
    }));
    if (!this.props.tableKey) {
      return;
    }
    if (!globalTableState[this.props.tableKey]) {
      globalTableState[this.props.tableKey] = {};
    }
    globalTableState[this.props.tableKey][id] = width;
  };

  scrollToBottom() {
    const {current: tableRef} = this.tableRef;

    if (tableRef && this.props.rows.length > 1) {
      tableRef.scrollToItem(this.props.rows.length - 1);
    }
  }

  onHighlight = (e: React.MouseEvent, row: TableBodyRow, index: number) => {
    if (!this.props.highlightableRows) {
      return;
    }
    const {platform} = getRenderHostInstance().serverConfig.environmentInfo.os;

    if (e.shiftKey) {
      // prevents text selection
      e.preventDefault();
    }

    let {highlightedRows} = this.state;

    const contextClick =
      e.button !== 0 || (platform === 'darwin' && e.button === 0 && e.ctrlKey);

    if (contextClick) {
      if (!highlightedRows.has(row.key)) {
        highlightedRows.clear();
        highlightedRows.add(row.key);
      }
      return;
    }

    this.dragStartIndex = index;
    document.addEventListener('mouseup', this.onStopDragSelecting);

    if (
      ((platform === 'darwin' && e.metaKey) ||
        (platform !== 'darwin' && e.ctrlKey)) &&
      this.props.multiHighlight
    ) {
      highlightedRows.add(row.key);
    } else if (e.shiftKey && this.props.multiHighlight) {
      // range select
      const lastItemKey = Array.from(highlightedRows).pop()!;
      highlightedRows = new Set([
        ...highlightedRows,
        ...this.selectInRange(lastItemKey, row.key),
      ]);
    } else {
      // single select
      highlightedRows.clear();
      highlightedRows.add(row.key);
    }

    this.onRowHighlighted(highlightedRows);
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

  onMouseEnterRow = (e: React.MouseEvent, row: TableBodyRow, index: number) => {
    const {dragStartIndex} = this;
    const {current} = this.tableRef;
    if (
      dragStartIndex &&
      current &&
      this.props.multiHighlight &&
      this.props.highlightableRows &&
      !e.shiftKey // When shift key is pressed, it's a range select not a drag select
    ) {
      current.scrollToItem(index + 1);
      const startKey = this.props.rows[dragStartIndex].key;
      const highlightedRows = new Set(this.selectInRange(startKey, row.key));
      this.onRowHighlighted(highlightedRows);
    }
  };

  onCopyCell = (rowId: string, index: number) => {
    const cellText = this.getTextContentOfRow(rowId)[index];
    getFlipperLib().writeTextToClipboard(cellText);
  };

  buildContextMenuItems: () => Array<ContextMenuItem> = () => {
    const {highlightedRows} = this.state;
    if (highlightedRows.size === 0) {
      return [];
    }

    const copyCellSubMenu =
      highlightedRows.size === 1
        ? [
            {
              label: 'Copy cell',
              submenu: this.state.columnOrder
                .filter((c) => c.visible)
                .map((c) => c.key)
                .map((column, index) => ({
                  label: this.props.columns[column].value,
                  click: () => {
                    const rowId = this.state.highlightedRows
                      .values()
                      .next().value;
                    rowId && this.onCopyCell(rowId, index);
                  },
                })),
            },
          ]
        : [];

    return [
      ...copyCellSubMenu,
      {
        label:
          highlightedRows.size > 1
            ? `Copy ${highlightedRows.size} rows`
            : 'Copy row',
        submenu: [
          {label: 'With columns header', click: () => this.onCopy(true)},
          {
            label: 'Without columns header',
            click: () => {
              this.onCopy(false);
            },
          },
        ],
      },
      {
        label: 'Create Paste',
        click: () =>
          createPaste(
            [this.getHeaderText(), this.getSelectedText()].join('\n'),
          ),
      },
    ];
  };

  getHeaderText = (): string => {
    return this.state.columnOrder
      .filter((c) => c.visible)
      .map((c) => c.key)
      .map((key) => this.props.columns[key].value)
      .join('\t');
  };

  getSelectedText = (): string => {
    const {highlightedRows} = this.state;

    if (highlightedRows.size === 0) {
      return '';
    }
    return this.props.rows
      .filter((row) => highlightedRows.has(row.key))
      .map((row: TableBodyRow) =>
        typeof row.copyText === 'function'
          ? row.copyText()
          : row.copyText || this.getTextContentOfRow(row.key).join('\t'),
      )
      .join('\n');
  };

  getTextContentOfRow = (key: string): Array<string> => {
    const row = this.props.rows.find((row) => row.key === key);
    if (!row) {
      return [];
    }
    return this.state.columnOrder
      .filter(({visible}) => visible)
      .map(({key}) => textContent(row.columns[key].value));
  };

  onScroll = debounce(
    ({
      scrollDirection,
      scrollOffset,
    }: {
      scrollDirection: 'forward' | 'backward';
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      const {current} = this.scrollRef;
      const parent = current ? current.parentElement : null;
      if (
        this.props.stickyBottom &&
        current &&
        parent instanceof HTMLElement &&
        scrollDirection === 'forward' &&
        !this.state.shouldScrollToBottom &&
        current.offsetHeight - parent.offsetHeight === scrollOffset
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

  getRow = ({index, style}: {index: number; style: React.CSSProperties}) => {
    const {onAddFilter, multiline, zebra, rows} = this.props;
    const {columnKeys, columnSizes, highlightedRows} = this.state;

    return (
      <TableRow
        key={rows[index].key}
        columnSizes={columnSizes}
        columnKeys={columnKeys}
        onMouseDown={this.onHighlight}
        onMouseEnter={this.onMouseEnterRow}
        multiline={multiline}
        rowLineHeight={24}
        highlighted={highlightedRows.has(rows[index].key)}
        row={rows[index]}
        index={index}
        style={style}
        onAddFilter={onAddFilter}
        zebra={zebra}
      />
    );
  };

  render() {
    const {columns, rows, rowLineHeight, hideHeader, horizontallyScrollable} =
      this.props;
    const {columnOrder, columnSizes} = this.state;

    let computedWidth = 0;
    if (horizontallyScrollable) {
      for (let index = 0; index < columnOrder.length; index++) {
        const col = columnOrder[index];

        if (!col.visible || !columns[col.key]) {
          continue;
        }

        const width = columnSizes[col.key];
        if (typeof width === 'number' && isNaN(width)) {
          // non-numeric columns with, can't caluclate
          computedWidth = 0;
          break;
        } else {
          computedWidth += parseInt(String(width), 10);
        }
      }
    }

    return (
      <Container
        canOverflow={horizontallyScrollable}
        onKeyDown={this.onKeyDown}
        tabIndex={0}>
        {hideHeader !== true && (
          <TableHead
            columnOrder={columnOrder}
            onColumnOrder={this.onColumnOrder}
            columns={columns}
            onColumnResize={this.onColumnResize}
            sortOrder={this.state.sortOrder}
            columnSizes={columnSizes}
            onSort={this.onSort}
            horizontallyScrollable={horizontallyScrollable}
          />
        )}
        <Container>
          {this.props.autoHeight ? (
            <ContextMenu
              buildItems={
                this.props.buildContextMenuItems || this.buildContextMenuItems
              }>
              {this.props.rows.map((_, index) =>
                this.getRow({index, style: EMPTY_OBJECT}),
              )}
            </ContextMenu>
          ) : (
            <AutoSizer>
              {({width, height}) => (
                <ContextMenu
                  buildItems={
                    this.props.buildContextMenuItems ||
                    this.buildContextMenuItems
                  }>
                  <List
                    itemCount={rows.length}
                    itemSize={(index) =>
                      (rows[index] && rows[index].height) ||
                      rowLineHeight ||
                      DEFAULT_ROW_HEIGHT
                    }
                    ref={this.tableRef}
                    width={Math.max(width, computedWidth)}
                    estimatedItemSize={rowLineHeight || DEFAULT_ROW_HEIGHT}
                    overscanCount={5}
                    innerRef={this.scrollRef}
                    onScroll={this.onScroll}
                    height={height}>
                    {this.getRow}
                  </List>
                </ContextMenu>
              )}
            </AutoSizer>
          )}
        </Container>
      </Container>
    );
  }
}

export default debounceRender(ManagedTable, 150, {maxWait: 250});
