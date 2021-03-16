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
import {Sorting, OnColumnResize, SortDirection} from './useDataTableManager';
import {ColumnFilterHandlers, FilterIcon} from './ColumnFilter';

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
      color: theme.primaryColor,
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
  [`&:hover button`]: {
    visibility: 'visible !important' as any,
  },
}));
TableHeadColumnContainer.displayName = 'TableHead:TableHeadColumnContainer';

const TableHeadContainer = styled.div({
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  borderBottom: `1px solid ${theme.dividerColor}`,
  backgroundColor: theme.backgroundWash,
  userSelect: 'none',
  borderLeft: `4px solid ${theme.backgroundWash}`, // space for selection, see TableRow
});
TableHeadContainer.displayName = 'TableHead:TableHeadContainer';

const RIGHT_RESIZABLE = {right: true};

function TableHeadColumn({
  column,
  isResizable,
  onColumnResize,
  onSort,
  sorted,
  ...filterHandlers
}: {
  column: DataTableColumn<any>;
  sorted: SortDirection;
  isResizable: boolean;
  onSort: (id: string, direction: SortDirection) => void;
  sortOrder: undefined | Sorting;
  onColumnResize: OnColumnResize;
} & ColumnFilterHandlers) {
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

    onColumnResize(column.key, normalizedWidth);
  };

  let children = (
    <Layout.Right center>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSort(
            column.key,
            sorted === 'asc' ? 'desc' : sorted === 'desc' ? undefined : 'asc',
          );
        }}
        role="button"
        tabIndex={0}>
        <Text type="secondary">
          {column.title ?? <>&nbsp;</>}
          <SortIcons
            direction={sorted}
            onSort={(dir) => onSort(column.key, dir)}
          />
        </Text>
      </div>
      <FilterIcon column={column} {...filterHandlers} />
    </Layout.Right>
  );

  if (isResizable) {
    children = (
      <TableHeaderColumnInteractive
        grow={true}
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
  ...props
}: {
  visibleColumns: DataTableColumn<any>[];
  onColumnResize: OnColumnResize;
  onReset: () => void;
  sorting: Sorting | undefined;
  onColumnSort: (key: string, direction: SortDirection) => void;
} & ColumnFilterHandlers) {
  return (
    <TableHeadContainer>
      {visibleColumns.map((column, i) => (
        <TableHeadColumn
          key={column.key}
          column={column}
          isResizable={i < visibleColumns.length - 1}
          sortOrder={props.sorting}
          onSort={props.onColumnSort}
          onColumnResize={props.onColumnResize}
          onAddColumnFilter={props.onAddColumnFilter}
          onRemoveColumnFilter={props.onRemoveColumnFilter}
          onToggleColumnFilter={props.onToggleColumnFilter}
          onSetColumnFilterFromSelection={props.onSetColumnFilterFromSelection}
          sorted={
            props.sorting?.key === column.key
              ? props.sorting!.direction
              : undefined
          }
        />
      ))}
    </TableHeadContainer>
  );
});
