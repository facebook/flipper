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
} from '../utils/widthUtils';
import {useRef} from 'react';
import {Interactive, InteractiveProps} from '../Interactive';
import styled from '@emotion/styled';
import React from 'react';
import {theme} from '../theme';
import type {DataTableColumn} from './DataTable';

import {Button, Checkbox, Dropdown, Menu, Typography} from 'antd';
import {CaretDownFilled, CaretUpFilled, DownOutlined} from '@ant-design/icons';
import {Layout} from '../Layout';
import {Sorting, OnColumnResize} from './useDataTableManager';

const {Text} = Typography;

const TableHeaderArrow = styled.span({
  float: 'right',
});
TableHeaderArrow.displayName = 'TableHead:TableHeaderArrow';

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
    marginLeft: 4,
    color: theme.disabledColor,
  }),
);

const TableHeaderColumnInteractive = styled(Interactive)<InteractiveProps>({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
});
TableHeaderColumnInteractive.displayName =
  'TableHead:TableHeaderColumnInteractive';

const TableHeaderColumnContainer = styled(Layout.Horizontal)({
  padding: '4px 8px',
  ':hover': {
    backgroundColor: theme.buttonDefaultBackground,
  },
  [`:hover ${SortIconsContainer}`]: {
    visibility: 'visible',
  },
});
TableHeaderColumnContainer.displayName = 'TableHead:TableHeaderColumnContainer';

const TableHeadContainer = styled.div<{horizontallyScrollable?: boolean}>({
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  borderBottom: `1px solid ${theme.dividerColor}`,
  backgroundColor: theme.backgroundWash,
  userSelect: 'none',
});
TableHeadContainer.displayName = 'TableHead:TableHeadContainer';

const TableHeadColumnContainer = styled.div<{
  width: Width;
}>((props) => ({
  flexShrink: props.width === undefined ? 1 : 0,
  flexGrow: props.width === undefined ? 1 : 0,
  width: props.width === undefined ? '100%' : props.width,
}));
TableHeadColumnContainer.displayName = 'TableHead:TableHeadColumnContainer';

const RIGHT_RESIZABLE = {right: true};

function TableHeadColumn({
  id,
  title,
  width,
  isResizable,
  isSortable,
  onColumnResize,
  isSortable: sortable,
  onSort,
  sorted,
}: {
  id: string;
  width: Width;
  isSortable?: boolean;
  sorted: 'up' | 'down' | undefined;
  isResizable: boolean;
  onSort: (id: string) => void;
  sortOrder: undefined | Sorting;
  onColumnResize: OnColumnResize;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onResize = (newWidth: number) => {
    if (!isResizable) {
      return;
    }

    let normalizedWidth: number | Percentage = newWidth;

    // normalise number to a percentage if we were originally passed a percentage
    if (isPercentage(width) && ref.current) {
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

    onColumnResize(id, normalizedWidth);
  };

  let children = (
    <TableHeaderColumnContainer center>
      <Text strong>{title}</Text>
      {isSortable && <SortIcons direction={sorted} />}
    </TableHeaderColumnContainer>
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
    <TableHeadColumnContainer
      width={width}
      title={title}
      onClick={sortable ? () => onSort(id) : undefined}
      ref={ref}>
      {children}
    </TableHeadColumnContainer>
  );
}

export function TableHead({
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
}) {
  const menu = (
    <Menu style={{minWidth: 200}}>
      {columns.map((column) => (
        <Menu.Item
          key={column.key}
          onClick={(e) => {
            e.domEvent.stopPropagation();
            e.domEvent.preventDefault();
            props.onColumnToggleVisibility(column.key);
          }}>
          <Checkbox checked={column.visible}>
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
          id={column.key}
          isResizable={i < visibleColumns.length - 1}
          width={column.width}
          isSortable={true} // might depend in the future on for example .getValue()
          sortOrder={props.sorting}
          onSort={props.onColumnSort}
          onColumnResize={props.onColumnResize}
          sorted={
            props.sorting?.key === column.key
              ? props.sorting!.direction
              : undefined
          }
          title={column.title}
        />
      ))}
      <Dropdown overlay={menu} trigger={['click']}>
        <SettingsButton type="text">
          <DownOutlined />
        </SettingsButton>
      </Dropdown>
    </TableHeadContainer>
  );
}

const SettingsButton = styled(Button)({
  padding: 4,
  position: 'absolute',
  right: 0,
  top: 0,
  backgroundColor: theme.backgroundWash,
});
