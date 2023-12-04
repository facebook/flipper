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
  TableOnColumnResize,
  TableOnSort,
  TableRowSortOrder,
} from './types';
import {normalizeColumnWidth, isPercentage} from './utils';
import {PureComponent} from 'react';
import ContextMenu, {ContextMenuItem} from '../ContextMenu';
import {theme, _Interactive, _InteractiveProps} from 'flipper-plugin';
import styled from '@emotion/styled';
import {colors} from '../colors';
import FlexRow from '../FlexRow';
import React from 'react';

const TableHeaderArrow = styled.span({
  float: 'right',
});
TableHeaderArrow.displayName = 'TableHead:TableHeaderArrow';

const TableHeaderColumnInteractive = styled(_Interactive)<_InteractiveProps>({
  display: 'inline-block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
});
TableHeaderColumnInteractive.displayName =
  'TableHead:TableHeaderColumnInteractive';

const TableHeaderColumnContainer = styled.div({
  padding: '0 8px',
});
TableHeaderColumnContainer.displayName = 'TableHead:TableHeaderColumnContainer';

const TableHeadContainer = styled(FlexRow)<{horizontallyScrollable?: boolean}>(
  (props) => ({
    borderBottom: `1px solid ${theme.dividerColor}`,
    flexShrink: 0,
    left: 0,
    overflow: 'hidden',
    right: 0,
    textAlign: 'left',
    top: 0,
    zIndex: 2,
    minWidth: props.horizontallyScrollable ? 'min-content' : 0,
  }),
);
TableHeadContainer.displayName = 'TableHead:TableHeadContainer';

const TableHeadColumnContainer = styled.div<{width: string | number}>(
  (props) => ({
    position: 'relative',
    backgroundColor: theme.backgroundWash,
    flexShrink: props.width === 'flex' ? 1 : 0,
    height: 23,
    lineHeight: '23px',
    fontSize: '0.85em',
    fontWeight: 500,
    width: props.width === 'flex' ? '100%' : props.width,
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
  }),
);
TableHeadColumnContainer.displayName = 'TableHead:TableHeadColumnContainer';

const RIGHT_RESIZABLE = {right: true};

function calculatePercentage(parentWidth: number, selfWidth: number): string {
  return `${(100 / parentWidth) * selfWidth}%`;
}

class TableHeadColumn extends PureComponent<{
  id: string;
  width: string | number;
  sortable?: boolean;
  isResizable: boolean;
  leftHasResizer: boolean;
  hasFlex: boolean;
  sortOrder?: TableRowSortOrder;
  onSort?: TableOnSort;
  columnSizes: TableColumnSizes;
  onColumnResize?: TableOnColumnResize;
  children?: React.ReactNode;
  title?: string;
  horizontallyScrollable?: boolean;
}> {
  ref: HTMLElement | undefined | null;

  componentDidMount() {
    if (this.props.horizontallyScrollable && this.ref) {
      // measure initial width
      this.onResize(this.ref.getBoundingClientRect().width);
    }
  }

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
    const {id, onColumnResize, width} = this.props;
    if (!onColumnResize) {
      return;
    }

    let normalizedWidth: number | string = newWidth;

    // normalise number to a percentage if we were originally passed a percentage
    if (isPercentage(width) && this.ref) {
      const {parentElement} = this.ref;
      if (!parentElement) {
        throw new Error('expected there to be parentElement');
      }

      const parentMeasures = parentElement.getBoundingClientRect();
      const parentWidth = parentMeasures.width;
      const {childNodes} = parentElement;

      const lastElem = childNodes[childNodes.length - 1];
      let right = 0;
      if (lastElem instanceof HTMLElement) {
        const lastElemMeasures = lastElem.getBoundingClientRect();
        right = lastElemMeasures.left + lastElemMeasures.width;
      }

      if (right < parentWidth) {
        normalizedWidth = calculatePercentage(parentWidth, newWidth);
      }
    }

    onColumnResize(id, normalizedWidth);
  };

  setRef = (ref: HTMLElement | null) => {
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
          grow
          resizable={RIGHT_RESIZABLE}
          onResize={this.onResize}
          minWidth={20}>
          {children}
        </TableHeaderColumnInteractive>
      );
    }

    return (
      <TableHeadColumnContainer
        width={width}
        title={title}
        onClick={sortable === true ? this.onClick : undefined}
        ref={this.setRef}>
        {children}
      </TableHeadColumnContainer>
    );
  }
}

export default class TableHead extends PureComponent<{
  columnOrder: TableColumnOrder;
  onColumnOrder?: (order: TableColumnOrder) => void;
  columns: TableColumns;
  sortOrder?: TableRowSortOrder;
  onSort?: TableOnSort;
  columnSizes: TableColumnSizes;
  onColumnResize?: TableOnColumnResize;
  horizontallyScrollable?: boolean;
}> {
  buildContextMenu = (): ContextMenuItem[] => {
    const visibles = this.props.columnOrder
      .map((c) => (c.visible ? c.key : null))
      .filter(Boolean)
      .reduce((acc, cv) => {
        acc.add(cv);
        return acc;
      }, new Set());
    return Object.keys(this.props.columns).map((key) => {
      const visible = visibles.has(key);
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
        type: 'checkbox' as 'checkbox',
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
      horizontallyScrollable,
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

    const colElems: {
      [key: string]: JSX.Element;
    } = {};
    for (const column of columnOrder) {
      if (!column.visible) {
        continue;
      }

      const key = column.key;
      const col = columns[key];
      if (!col) {
        console.warn('no column for key: ', key);
        continue;
      }

      let arrow;
      if (col.sortable === true && sortOrder && sortOrder.key === key) {
        arrow = (
          <TableHeaderArrow>
            {sortOrder.direction === 'up' ? '▲' : '▼'}
          </TableHeaderArrow>
        );
      }

      const width = normalizeColumnWidth(columnSizes[key]);
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
          title={key}
          horizontallyScrollable={horizontallyScrollable}>
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
        <TableHeadContainer horizontallyScrollable={horizontallyScrollable}>
          {elems}
        </TableHeadContainer>
      </ContextMenu>
    );
  }
}
