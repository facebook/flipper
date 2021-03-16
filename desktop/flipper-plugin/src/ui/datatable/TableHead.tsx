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

import {Checkbox, Dropdown, Menu, Typography} from 'antd';
import {CaretDownFilled, CaretUpFilled, DownOutlined} from '@ant-design/icons';
import {Layout} from '../Layout';
import {Sorting, OnColumnResize} from './useDataTableManager';
import {ColumnFilterHandlers, FilterIcon, HeaderButton} from './ColumnFilter';

const {Text} = Typography;

function SortIcons({direction}: {direction?: 'up' | 'down'}) {
  return (
    <SortIconsContainer direction={direction}>
      <CaretUpFilled
        className={
          'ant-table-column-sorter-up ' + (direction === 'up' ? 'active' : '')
        }
      />
      <CaretDownFilled
        className={
          'ant-table-column-sorter-down ' +
          (direction === 'down' ? 'active' : '')
        }
      />
    </SortIconsContainer>
  );
}

const SortIconsContainer = styled.span<{direction?: 'up' | 'down'}>(
  ({direction}) => ({
    visibility: direction === undefined ? 'hidden' : undefined,
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    left: 4,
    top: -3,
    color: theme.disabledColor,
  }),
);

const SettingsButton = styled(HeaderButton)({
  position: 'absolute',
  right: 0,
  top: 0,
});

const TableHeaderColumnInteractive = styled(Interactive)<InteractiveProps>({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
});
TableHeaderColumnInteractive.displayName =
  'TableHead:TableHeaderColumnInteractive';

const TableHeadContainer = styled.div<{horizontallyScrollable?: boolean}>({
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  borderBottom: `1px solid ${theme.dividerColor}`,
  backgroundColor: theme.backgroundWash,
  userSelect: 'none',
  borderLeft: `4px solid ${theme.backgroundWash}`, // space for selection, see TableRow
});
TableHeadContainer.displayName = 'TableHead:TableHeadContainer';

const TableHeadColumnContainer = styled.div<{
  width: Width;
}>((props) => ({
  flexShrink: props.width === undefined ? 1 : 0,
  flexGrow: props.width === undefined ? 1 : 0,
  width: props.width === undefined ? '100%' : props.width,
  '&:last-of-type': {
    marginRight: 20, // space for settings button
  },
  [`:hover ${SortIconsContainer}`]: {
    visibility: 'visible',
  },
  [`&:hover ${HeaderButton}`]: {
    visibility: 'visible !important' as any,
  },
  padding: '0 4px',
}));
TableHeadColumnContainer.displayName = 'TableHead:TableHeadColumnContainer';

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
  sorted: 'up' | 'down' | undefined;
  isResizable: boolean;
  onSort: (id: string) => void;
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
    <Layout.Right center style={{padding: '0 4px'}}>
      <div onClick={() => onSort(column.key)} role="button" tabIndex={0}>
        <Text strong>
          {column.title ?? <>&nbsp;</>}
          <SortIcons direction={sorted} />
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
  columns,
  visibleColumns,
  ...props
}: {
  columns: DataTableColumn<any>[];
  visibleColumns: DataTableColumn<any>[];
  onColumnResize: OnColumnResize;
  onColumnToggleVisibility: (key: string) => void;
  onReset: () => void;
  sorting: Sorting | undefined;
  onColumnSort: (key: string) => void;
} & ColumnFilterHandlers) {
  const menu = (
    <Menu style={{minWidth: 200}}>
      {columns.map((column) => (
        <Menu.Item key={column.key}>
          <Checkbox
            checked={column.visible}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              props.onColumnToggleVisibility(column.key);
            }}>
            {column.title || column.key}
          </Checkbox>
        </Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item key="reset" onClick={props.onReset}>
        Reset
      </Menu.Item>
    </Menu>
  );

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
          sorted={
            props.sorting?.key === column.key
              ? props.sorting!.direction
              : undefined
          }
        />
      ))}
      <Dropdown overlay={menu} trigger={['click']}>
        <SettingsButton type="text">
          <DownOutlined />
        </SettingsButton>
      </Dropdown>
    </TableHeadContainer>
  );
});
