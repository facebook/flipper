/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  calculatePercentage,
  isPercentage,
  Percentage,
  Width,
} from '../../utils/widthUtils';
import {memo, useRef} from 'react';
import {Interactive, InteractiveProps} from '../Interactive';
import styled from '@emotion/styled';
import React from 'react';
import {theme} from '../theme';
import type {DataTableColumn} from './DataTable';

import {Typography} from 'antd';
import {CaretDownFilled, CaretUpFilled} from '@ant-design/icons';
import {Layout} from '../Layout';
import {Sorting, SortDirection, DataTableDispatch} from './DataTableManager';
import {FilterButton, FilterIcon} from './ColumnFilter';
import {toFirstUpper} from '../../utils/toFirstUpper';

const {Text} = Typography;

function SortIcons({
  direction,
  onSort,
}: {
  direction?: SortDirection;
  onSort(direction: SortDirection): void;
}) {
  return (
    <SortIconsContainer direction={direction}>
      <CaretUpFilled
        onClick={(e) => {
          e.stopPropagation();
          onSort(direction === 'asc' ? undefined : 'asc');
        }}
        className={
          'ant-table-column-sorter-up ' + (direction === 'asc' ? 'active' : '')
        }
      />
      <CaretDownFilled
        onClick={(e) => {
          e.stopPropagation();
          onSort(direction === 'desc' ? undefined : 'desc');
        }}
        className={
          'ant-table-column-sorter-down ' +
          (direction === 'desc' ? 'active' : '')
        }
      />
    </SortIconsContainer>
  );
}

const SortIconsContainer = styled.span<{direction?: 'asc' | 'desc'}>(
  ({direction}) => ({
    visibility: direction === undefined ? 'hidden' : undefined,
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    left: 4,
    top: -3,
    cursor: 'pointer',
    color: theme.disabledColor,
    '.ant-table-column-sorter-up:hover, .ant-table-column-sorter-down:hover': {
      color: theme.textColorActive,
    },
  }),
);

const TableHeaderColumnInteractive = styled(Interactive)<InteractiveProps>({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
  borderRight: `1px solid ${theme.dividerColor}`,
  paddingRight: 4,
});
TableHeaderColumnInteractive.displayName =
  'TableHead:TableHeaderColumnInteractive';

const TableHeadColumnContainer = styled.div<{
  width: Width;
}>((props) => ({
  // height: DEFAULT_ROW_HEIGHT,
  flexShrink: props.width === undefined ? 1 : 0,
  flexGrow: props.width === undefined ? 1 : 0,
  width: props.width === undefined ? '100%' : props.width,
  paddingLeft: 8,
  [`:hover ${SortIconsContainer}`]: {
    visibility: 'visible',
  },
  [`&:hover ${FilterButton}`]: {
    visibility: 'visible',
  },
}));
TableHeadColumnContainer.displayName = 'TableHead:TableHeadColumnContainer';

const TableHeadContainer = styled.div<{scrollbarSize: number}>(
  ({scrollbarSize}) => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    borderBottom: `1px solid ${theme.dividerColor}`,
    backgroundColor: theme.backgroundWash,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderLeft: `4px solid ${theme.backgroundWash}`, // space for selection, see TableRow
    // hardcoded value to correct for the scrollbar in the main container.
    // ideally we should measure this instead.
    paddingRight: scrollbarSize,
  }),
);
TableHeadContainer.displayName = 'TableHead:TableHeadContainer';

const RIGHT_RESIZABLE = {right: true};

function TableHeadColumn({
  column,
  isResizable,
  sorted,
  dispatch,
}: {
  column: DataTableColumn<any>;
  sorted: SortDirection;
  isResizable: boolean;
  dispatch: DataTableDispatch;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onResize = (newWidth: number) => {
    if (!isResizable) {
      return;
    }

    let normalizedWidth: number | Percentage = newWidth;

    // normalise number to a percentage if we were originally passed a percentage
    if (isPercentage(column.width) && ref.current) {
      const {parentElement} = ref.current;
      const parentWidth = parentElement!.clientWidth;
      const {childNodes} = parentElement!;

      const lastElem = childNodes[childNodes.length - 1];
      const right =
        lastElem instanceof HTMLElement
          ? lastElem.offsetLeft + lastElem.clientWidth + 1
          : 0;

      if (right < parentWidth) {
        normalizedWidth = calculatePercentage(parentWidth, newWidth);
      }
    }

    dispatch({
      type: 'resizeColumn',
      column: column.key,
      width: normalizedWidth,
    });
  };

  let children = (
    <Layout.Right center>
      <div
        onClick={(e) => {
          e.stopPropagation();
          const newDirection =
            sorted === undefined
              ? 'asc'
              : sorted === 'asc'
              ? 'desc'
              : undefined;
          dispatch({
            type: 'sortColumn',
            column: column.key,
            direction: newDirection,
          });
        }}
        role="button"
        tabIndex={0}>
        <Text type="secondary">
          {column.title === undefined ? (
            toFirstUpper(column.key)
          ) : column.title === '' ? (
            <>&nbsp;</>
          ) : (
            column.title
          )}
          <SortIcons
            direction={sorted}
            onSort={(dir) =>
              dispatch({type: 'sortColumn', column: column.key, direction: dir})
            }
          />
        </Text>
      </div>
      <FilterIcon column={column} dispatch={dispatch} />
    </Layout.Right>
  );

  if (isResizable) {
    children = (
      <TableHeaderColumnInteractive
        grow
        resizable={RIGHT_RESIZABLE}
        onResize={onResize}
        minWidth={20}>
        {children}
      </TableHeaderColumnInteractive>
    );
  }

  return (
    <TableHeadColumnContainer width={column.width} ref={ref}>
      {children}
    </TableHeadColumnContainer>
  );
}

export const TableHead = memo(function TableHead({
  visibleColumns,
  dispatch,
  sorting,
  scrollbarSize,
}: {
  dispatch: DataTableDispatch<any>;
  visibleColumns: DataTableColumn<any>[];
  sorting: Sorting | undefined;
  scrollbarSize: number;
}) {
  return (
    <TableHeadContainer scrollbarSize={scrollbarSize}>
      {visibleColumns.map((column, i) => (
        <TableHeadColumn
          key={column.key}
          column={column}
          isResizable={i < visibleColumns.length - 1}
          dispatch={dispatch}
          sorted={sorting?.key === column.key ? sorting!.direction : undefined}
        />
      ))}
    </TableHeadContainer>
  );
});
