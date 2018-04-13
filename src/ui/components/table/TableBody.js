/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableBodyRow,
  TableColumnKeys,
  TableColumnSizes,
  TableHighlightedRows,
  TableOnDragSelect,
  TableOnHighlight,
  TableRows,
  TableOnAddFilter,
} from './types.js';
import {FixedList, DynamicList} from '../../../ui/virtualized/index.js';
import {normaliseColumnWidth} from './utils.js';
import {PureComponent} from 'react';

import FilterRow from '../filter/FilterRow.js';
import {DEFAULT_ROW_HEIGHT} from './types.js';
import styled from '../../styled/index.js';
import FlexColumn from '../FlexColumn.js';
import {ContextMenu} from 'sonar';

import FlexRow from '../FlexRow.js';
import {colors} from '../colors.js';

const TableBodyContainer = FlexColumn.extends(
  {
    backgroundColor: colors.white,
    zIndex: 1,
    flexGrow: props => (props.autoHeight ? 0 : 1),
    flexShrink: props => (props.autoHeight ? 0 : 1),
    flexBasis: props => (props.autoHeight ? 'content' : 0),
    overflow: props => (props.autoHeight ? 'hidden' : 'auto'),
    maxWidth: '100%',
  },
  {
    ignoreAttributes: ['autoHeight'],
  },
);

const TableBodyRowContainer = FlexRow.extends(
  {
    backgroundColor: props => {
      if (props.highlighted) {
        if (props.highlightedBackgroundColor) {
          return props.highlightedBackgroundColor;
        } else {
          return colors.macOSTitleBarIconSelected;
        }
      } else {
        if (props.backgroundColor) {
          return props.backgroundColor;
        } else if (props.even && props.zebra) {
          return colors.light02;
        } else {
          return 'transparent';
        }
      }
    },
    boxShadow: props => {
      if (props.backgroundColor || props.zebra === false) {
        return 'inset 0 -1px #E9EBEE';
      } else {
        return 'none';
      }
    },
    color: props =>
      props.highlighted ? colors.white : props.color || 'inherit',
    '& *': {
      color: props => (props.highlighted ? `${colors.white} !important` : null),
    },
    '& img': {
      backgroundColor: props =>
        props.highlighted ? `${colors.white} !important` : 'none',
    },
    height: props => (props.multiline ? 'auto' : props.rowLineHeight),
    lineHeight: props => `${String(props.rowLineHeight)}px`,
    fontWeight: props => props.fontWeight || 'inherit',
    overflow: 'hidden',
    width: '100%',
    userSelect: 'none',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: props =>
        !props.highlighted && props.highlightOnHover ? colors.light02 : 'none',
    },
  },
  {
    ignoreAttributes: [
      'highlightedBackgroundColor',
      'highlightOnHover',
      'backgroundColor',
      'rowLineHeight',
      'highlighted',
      'multiline',
      'hasHover',
      'zebra',
      'even',
    ],
  },
);

const TableBodyColumnContainer = styled.view(
  {
    display: 'flex',
    flexShrink: props => (props.width === 'flex' ? 1 : 0),
    overflow: 'hidden',
    padding: '0 8px',
    userSelect: 'none',
    textOverflow: 'ellipsis',
    verticalAlign: 'top',
    whiteSpace: props => (props.multiline ? 'normal' : 'nowrap'),
    wordWrap: props => (props.multiline ? 'break-word' : 'normal'),
    width: props => (props.width === 'flex' ? '100%' : props.width),
    maxWidth: '100%',
  },
  {
    ignoreAttributes: ['multiline', 'width'],
  },
);

type TableBodyRowElementProps = {
  columnSizes: TableColumnSizes,
  columnKeys: TableColumnKeys,
  onHighlight: ?TableOnHighlight,
  onMouseEnter?: (e: SyntheticMouseEvent<>) => void,
  multiline: ?boolean,
  rowLineHeight: number,
  highlightedRows: ?TableHighlightedRows,
  row: TableBodyRow,
  columnNo: number,
  style: ?Object,
  onCopyRows: () => void,
  onCreatePaste: () => void,
  onAddFilter?: TableOnAddFilter,
  zebra: ?boolean,
};

type TableBodyRowElementState = {
  contextMenu: any,
};

class TableBodyRowElement extends PureComponent<
  TableBodyRowElementProps,
  TableBodyRowElementState,
> {
  static defaultProps = {
    zebra: true,
  };

  onMouseDown = (e: SyntheticMouseEvent<>) => {
    if (e.button !== 0) {
      // Only highlight rows when using primary mouse button,
      // otherwise do nothing, to not interfere context menus.
      return;
    }
    if (e.shiftKey) {
      // prevents text selection
      e.preventDefault();
    }

    const {highlightedRows, onHighlight, row} = this.props;
    if (!onHighlight) {
      return;
    }

    let newHighlightedRows = highlightedRows ? highlightedRows.slice() : [];
    const alreadyHighlighted = newHighlightedRows.includes(row.key);
    if (
      (e.metaKey && process.platform === 'darwin') ||
      (e.ctrlKey && process.platform !== 'darwin')
    ) {
      if (alreadyHighlighted) {
        newHighlightedRows.splice(newHighlightedRows.indexOf(row.key), 1);
      } else {
        newHighlightedRows.push(row.key);
      }
    } else {
      newHighlightedRows = [row.key];
    }
    onHighlight(newHighlightedRows, e);
  };

  getContextMenu = () => {
    const {highlightedRows, onCopyRows, onCreatePaste} = this.props;
    return [
      {
        label:
          highlightedRows && highlightedRows.length > 1
            ? `Copy ${highlightedRows.length} items`
            : 'Copy all',
        click: onCopyRows,
      },
      {
        label:
          highlightedRows && highlightedRows.length > 1
            ? `Create paste from selection`
            : 'Create paste',
        click: onCreatePaste,
      },
    ];
  };

  render() {
    const {
      columnNo,
      highlightedRows,
      rowLineHeight,
      row,
      style,
      multiline,
      columnKeys,
      columnSizes,
      onMouseEnter,
      zebra,
    } = this.props;

    return (
      <ContextMenu buildItems={this.getContextMenu}>
        <TableBodyRowContainer
          rowLineHeight={rowLineHeight}
          highlightedBackgroundColor={row.highlightedBackgroundColor}
          backgroundColor={row.backgroundColor}
          highlighted={highlightedRows && highlightedRows.includes(row.key)}
          onDoubleClick={row.onDoubleClick}
          multiline={multiline}
          even={columnNo % 2 === 0}
          zebra={zebra}
          onMouseDown={this.onMouseDown}
          onMouseEnter={onMouseEnter}
          style={style}
          highlightOnHover={row.highlightOnHover}
          data-key={row.key}
          {...row.style}>
          {columnKeys.map(key => {
            const col = row.columns[key];
            if (col == null) {
              throw new Error(
                `Trying to access column "${key}" which does not exist on row. Make sure buildRow is returning a valid row.`,
              );
            }
            const isFilterable = col.isFilterable || false;
            const value = col ? col.value : '';
            const title = col ? col.title : '';
            return (
              <TableBodyColumnContainer
                key={key}
                title={title}
                multiline={multiline}
                width={normaliseColumnWidth(columnSizes[key])}>
                {isFilterable && this.props.onAddFilter != null ? (
                  <FilterRow addFilter={this.props.onAddFilter} filterKey={key}>
                    {value}
                  </FilterRow>
                ) : (
                  value
                )}
              </TableBodyColumnContainer>
            );
          })}
        </TableBodyRowContainer>
      </ContextMenu>
    );
  }
}

type TableBodyProps = {
  virtual: ?boolean,
  autoHeight: ?boolean,
  multiline: ?boolean,
  rowLineHeight: number,
  stickyBottom: ?boolean,
  zebra?: boolean,

  onHighlight: ?TableOnHighlight,
  highlightedRows: ?TableHighlightedRows,

  columnKeys: TableColumnKeys,
  columnSizes: TableColumnSizes,

  rows: TableRows,

  filterValue?: string,
  filter?: (row: TableBodyRow) => boolean,

  isDragging: boolean,
  onDragSelect: TableOnDragSelect,
  onCopyRows: () => void,
  onCreatePaste: () => void,
  onAddFilter?: TableOnAddFilter,
};

type TableBodyState = {
  atScrollBottom: boolean,
  pureBodyData: Array<any>,
};

export default class TableBody extends PureComponent<
  TableBodyProps,
  TableBodyState,
> {
  static defaultProps = {
    rowLineHeight: DEFAULT_ROW_HEIGHT,
  };

  state = {
    atScrollBottom: true,
    pureBodyData: [
      this.props.columnSizes,
      this.props.rows,
      this.props.highlightedRows,
    ],
  };

  listRef: ?DynamicList;
  scrollRef: ?any;
  keepSelectedRowInView: ?[number, number];

  buildElement = (
    key: string,
    row: TableBodyRow,
    index: number,
    style?: Object,
  ) => {
    let onMouseEnter;
    if (this.props.isDragging) {
      onMouseEnter = (e: SyntheticMouseEvent<>) =>
        this.props.onDragSelect(e, key, index);
    }
    return (
      <TableBodyRowElement
        key={key}
        columnNo={index}
        rowLineHeight={this.props.rowLineHeight}
        row={row}
        style={style}
        columnSizes={this.props.columnSizes}
        multiline={this.props.multiline}
        columnKeys={this.props.columnKeys}
        highlightedRows={this.props.highlightedRows}
        zebra={this.props.zebra}
        onHighlight={this.props.onHighlight}
        onMouseEnter={onMouseEnter}
        onCopyRows={this.props.onCopyRows}
        onCreatePaste={this.props.onCreatePaste}
        onAddFilter={this.props.onAddFilter}
      />
    );
  };

  buildVirtualElement = ({index, style}: {index: number, style: Object}) => {
    const row = this.props.rows[index];
    return this.buildElement(row.key, row, index, style);
  };

  buildAutoElement = (row: TableBodyRow, index: number) => {
    return this.buildElement(row.key, row, index);
  };

  componentDidMount() {
    this.maybeScrollToBottom();
  }

  componentWillUpdate(nextProps: TableBodyProps) {
    if (
      nextProps.highlightedRows != null &&
      nextProps.highlightedRows.length === 1 &&
      nextProps.filter !== this.props.filter &&
      nextProps.rows.length !== this.props.rows.length &&
      this.listRef != null
    ) {
      // We want to keep the selected row in the view once the filter changes.
      // Here we get the current position, in componentDidUpdate it is scrolled into view
      const {highlightedRows} = nextProps;
      const selectedIndex = nextProps.rows.findIndex(
        row => row.key === highlightedRows[0],
      );
      if (
        nextProps.rows[selectedIndex] != null &&
        nextProps.rows[selectedIndex].key != null
      ) {
        const rowDOMNode = document.querySelector(
          `[data-key="${nextProps.rows[selectedIndex].key}"]`,
        );
        let offset = 0;
        if (
          rowDOMNode != null &&
          rowDOMNode.parentElement instanceof HTMLElement
        ) {
          offset = rowDOMNode.parentElement.offsetTop;
        }
        this.keepSelectedRowInView = [selectedIndex, offset];
      }
    } else {
      this.keepSelectedRowInView = null;
    }
  }

  componentDidUpdate(prevProps: TableBodyProps) {
    if (this.listRef != null && this.keepSelectedRowInView != null) {
      this.listRef.scrollToIndex(...this.keepSelectedRowInView);
    } else {
      this.maybeScrollToBottom();
    }
  }

  maybeScrollToBottom = () => {
    // we only care if we have the stickyBottom prop
    if (this.props.stickyBottom !== true) {
      return;
    }

    // we only want to scroll to the bottom if we're actually at the bottom
    if (this.state.atScrollBottom === false) {
      return;
    }

    this.scrollToBottom();
  };

  scrollToBottom() {
    // only handle non-virtualised scrolling, virtualised scrolling is handled
    // by the getScrollToIndex method
    if (this.isVirtualisedDisabled()) {
      const {scrollRef} = this;
      if (scrollRef != null) {
        scrollRef.scrollTop = scrollRef.scrollHeight;
      }
    } else {
      const {listRef} = this;
      if (listRef != null) {
        listRef.scrollToIndex(this.props.rows.length - 1);
      }
    }
  }

  scrollRowIntoView(index: number) {
    if (
      this.isVirtualisedDisabled() &&
      this.scrollRef &&
      index < this.scrollRef.children.length
    ) {
      this.scrollRef.children[index].scrollIntoViewIfNeeded();
    }
  }

  componentWillReceiveProps(nextProps: TableBodyProps) {
    if (
      nextProps.columnSizes !== this.props.columnSizes ||
      nextProps.rows !== this.props.rows ||
      nextProps.highlightedRows !== this.props.highlightedRows
    ) {
      this.setState({
        pureBodyData: [
          nextProps.columnSizes,
          nextProps.rows,
          nextProps.highlightedRows,
        ],
      });
    }
  }

  setListRef = (ref: ?DynamicList) => {
    this.listRef = ref;
  };

  setNonVirtualScrollRef = (ref: any) => {
    this.scrollRef = ref;
    this.scrollToBottom();
  };

  onScroll = ({
    clientHeight,
    scrollHeight,
    scrollTop,
  }: {
    clientHeight: number,
    scrollHeight: number,
    scrollTop: number,
  }) => {
    // check if the user has scrolled within 20px of the bottom
    const bottom = scrollTop + clientHeight;
    const atScrollBottom = Math.abs(bottom - scrollHeight) < 20;

    if (atScrollBottom !== this.state.atScrollBottom) {
      this.setState({atScrollBottom});
    }
  };

  isVirtualisedDisabled() {
    return this.props.virtual === false || this.props.autoHeight === true;
  }

  keyMapper = (index: number): string => {
    return this.props.rows[index].key;
  };

  getPrecalculatedDimensions = (index: number) => {
    const row = this.props.rows[index];
    if (row != null && row.height != null) {
      return {
        height: row.height,
        width: '100%',
      };
    }
  };

  render() {
    if (this.isVirtualisedDisabled()) {
      return (
        <TableBodyContainer
          innerRef={this.setNonVirtualScrollRef}
          onScroll={this.onScroll}
          autoHeight={true}>
          {this.props.rows.map(this.buildAutoElement)}
        </TableBodyContainer>
      );
    }

    let children;

    if (this.props.multiline === true) {
      // multiline has a virtual list with dynamic heights
      children = (
        <DynamicList
          ref={this.setListRef}
          pureData={this.state.pureBodyData}
          keyMapper={this.keyMapper}
          rowCount={this.props.rows.length}
          rowRenderer={this.buildVirtualElement}
          onScroll={this.onScroll}
          getPrecalculatedDimensions={this.getPrecalculatedDimensions}
          onMount={this.maybeScrollToBottom}
        />
      );
    } else {
      // virtual list with a fixed row height
      children = (
        <FixedList
          pureData={this.state.pureBodyData}
          keyMapper={this.keyMapper}
          rowCount={this.props.rows.length}
          rowHeight={this.props.rowLineHeight}
          rowRenderer={this.buildVirtualElement}
          onScroll={this.onScroll}
          innerRef={this.setListRef}
          onMount={this.maybeScrollToBottom}
        />
      );
    }

    return <TableBodyContainer>{children}</TableBodyContainer>;
  }
}
