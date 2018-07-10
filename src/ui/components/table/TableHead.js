/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableColumnKeys,
  TableColumnOrder,
  TableColumnSizes,
  TableColumns,
  TableOnColumnResize,
  TableOnSort,
  TableRowSortOrder,
} from './types.js';

import {normaliseColumnWidth, isPercentage} from './utils.js';
import {PureComponent} from 'react';
import ContextMenu from '../ContextMenu.js';
import Interactive from '../Interactive.js';
import styled from '../../styled/index.js';
import {colors} from '../colors.js';

import FlexRow from '../FlexRow.js';

const invariant = require('invariant');

type MenuTemplate = Array<Electron$MenuItemOptions>;

const TableHeaderArrow = styled.text({
  float: 'right',
});

const TableHeaderColumnInteractive = Interactive.extends({
  display: 'inline-block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
});

const TableHeaderColumnContainer = styled.view({
  padding: '0 8px',
});

const TableHeadContainer = FlexRow.extends({
  borderBottom: `1px solid ${colors.sectionHeaderBorder}`,
  color: colors.light50,
  flexShrink: 0,
  left: 0,
  overflow: 'hidden',
  position: 'sticky',
  right: 0,
  textAlign: 'left',
  top: 0,
  zIndex: 2,
});

const TableHeadColumnContainer = styled.view(
  {
    position: 'relative',
    backgroundColor: colors.white,
    flexShrink: props => (props.width === 'flex' ? 1 : 0),
    height: 23,
    lineHeight: '23px',
    fontSize: '0.85em',
    fontWeight: 500,
    width: props => (props.width === 'flex' ? '100%' : props.width),
    '&::after': {
      position: 'absolute',
      content: '""',
      right: 0,
      top: 5,
      height: 13,
      width: 1,
      background: colors.light15,
    },
    '&:last-child::after': {
      display: 'none',
    },
  },
  {
    ignoreAttributes: ['width'],
  },
);

const RIGHT_RESIZABLE = {right: true};

function calculatePercentage(parentWidth: number, selfWidth: number): string {
  return `${(100 / parentWidth) * selfWidth}%`;
}

class TableHeadColumn extends PureComponent<{
  id: string,
  width: string | number,
  sortable: ?boolean,
  isResizable: boolean,
  leftHasResizer: boolean,
  hasFlex: boolean,
  sortOrder: ?TableRowSortOrder,
  onSort: ?TableOnSort,
  columnSizes: TableColumnSizes,
  onColumnResize: ?TableOnColumnResize,
  children?: React$Node,
  title?: string,
}> {
  ref: HTMLElement;

  onClick = () => {
    const {id, onSort, sortOrder} = this.props;

    const direction =
      sortOrder && sortOrder.key === id && sortOrder.direction === 'down'
        ? 'up'
        : 'down';

    if (onSort) {
      onSort({
        direction,
        key: id,
      });
    }
  };

  onResize = (newWidth: number) => {
    const {id, columnSizes, onColumnResize, width} = this.props;
    if (!onColumnResize) {
      return;
    }

    let normalizedWidth = newWidth;

    // normalise number to a percentage if we were originally passed a percentage
    if (isPercentage(width)) {
      const {parentElement} = this.ref;
      invariant(parentElement, 'expected there to be parentElement');

      const parentWidth = parentElement.clientWidth;
      const {childNodes} = parentElement;

      const lastElem = childNodes[childNodes.length - 1];
      const right =
        lastElem instanceof HTMLElement
          ? lastElem.offsetLeft + lastElem.clientWidth + 1
          : 0;

      if (right < parentWidth) {
        normalizedWidth = calculatePercentage(parentWidth, newWidth);
      }
    }

    onColumnResize({
      ...columnSizes,
      [id]: normalizedWidth,
    });
  };

  setRef = (ref: HTMLElement) => {
    this.ref = ref;
  };

  render() {
    const {isResizable, sortable, width, title} = this.props;
    let {children} = this.props;
    children = (
      <TableHeaderColumnContainer>{children}</TableHeaderColumnContainer>
    );

    if (isResizable) {
      children = (
        <TableHeaderColumnInteractive
          fill={true}
          resizable={RIGHT_RESIZABLE}
          onResize={this.onResize}>
          {children}
        </TableHeaderColumnInteractive>
      );
    }

    return (
      <TableHeadColumnContainer
        width={width}
        title={title}
        onClick={sortable === true ? this.onClick : undefined}
        innerRef={this.setRef}>
        {children}
      </TableHeadColumnContainer>
    );
  }
}

export default class TableHead extends PureComponent<{
  columnOrder: TableColumnOrder,
  onColumnOrder: ?(order: TableColumnOrder) => void,
  columnKeys: TableColumnKeys,
  columns: TableColumns,
  sortOrder: ?TableRowSortOrder,
  onSort: ?TableOnSort,
  columnSizes: TableColumnSizes,
  onColumnResize: ?TableOnColumnResize,
}> {
  buildContextMenu = (): MenuTemplate => {
    return Object.keys(this.props.columns).map(key => {
      const visible = this.props.columnKeys.includes(key);
      return {
        label: this.props.columns[key].value,
        click: () => {
          const {onColumnOrder, columnOrder} = this.props;
          if (onColumnOrder) {
            const newOrder = columnOrder.slice();
            let hasVisibleItem = false;
            for (let i = 0; i < newOrder.length; i++) {
              const info = newOrder[i];
              if (info.key === key) {
                newOrder[i] = {key, visible: !visible};
              }
              hasVisibleItem = hasVisibleItem || newOrder[i].visible;
            }

            // Dont allow hiding all columns
            if (hasVisibleItem) {
              onColumnOrder(newOrder);
            }
          }
        },
        type: 'checkbox',
        checked: visible,
      };
    });
  };

  render() {
    const {
      columnOrder,
      columns,
      columnSizes,
      onColumnResize,
      onSort,
      sortOrder,
    } = this.props;
    const elems = [];

    let hasFlex = false;
    for (const column of columnOrder) {
      if (column.visible && columnSizes[column.key] === 'flex') {
        hasFlex = true;
        break;
      }
    }

    let lastResizable = true;

    const colElems = {};
    for (const column of columnOrder) {
      if (!column.visible) {
        continue;
      }

      const key = column.key;
      const col = columns[key];

      let arrow;
      if (col.sortable === true && sortOrder && sortOrder.key === key) {
        arrow = (
          <TableHeaderArrow>
            {sortOrder.direction === 'up' ? '▲' : '▼'}
          </TableHeaderArrow>
        );
      }

      const width = normaliseColumnWidth(columnSizes[key]);
      const isResizable = col.resizable !== false;

      const elem = (
        <TableHeadColumn
          key={key}
          id={key}
          hasFlex={hasFlex}
          isResizable={isResizable}
          leftHasResizer={lastResizable}
          width={width}
          sortable={col.sortable}
          sortOrder={sortOrder}
          onSort={onSort}
          columnSizes={columnSizes}
          onColumnResize={onColumnResize}
          title={key}>
          {col.value}
          {arrow}
        </TableHeadColumn>
      );

      elems.push(elem);

      colElems[key] = elem;

      lastResizable = isResizable;
    }

    return (
      <ContextMenu buildItems={this.buildContextMenu}>
        <TableHeadContainer>{elems}</TableHeadContainer>
      </ContextMenu>
    );
  }
}
