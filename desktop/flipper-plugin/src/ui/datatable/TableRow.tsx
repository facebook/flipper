/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo, useContext} from 'react';
import styled from '@emotion/styled';
import {theme} from 'flipper-plugin';
import type {RenderContext} from './DataTable';
import {Width} from '../../utils/widthUtils';
import {pad} from 'lodash';
import {DownCircleFilled} from '@ant-design/icons';
import {Dropdown} from 'antd';
import {TableContextMenuContext} from './TableContextMenu';

// heuristic for row estimation, should match any future styling updates
export const DEFAULT_ROW_HEIGHT = 24;

type TableBodyRowContainerProps = {
  highlighted?: boolean;
};

const backgroundColor = (props: TableBodyRowContainerProps) => {
  if (props.highlighted) {
    return theme.primaryColor;
  }
  return undefined;
};

const CircleMargin = 4;
const RowContextMenu = styled(DownCircleFilled)({
  position: 'absolute',
  top: CircleMargin,
  right: CircleMargin,
  fontSize: DEFAULT_ROW_HEIGHT - CircleMargin * 2,
  borderRadius: (DEFAULT_ROW_HEIGHT - CircleMargin * 2) * 0.5,
  color: theme.primaryColor,
  cursor: 'pointer',
  visibility: 'hidden',
});

const TableBodyRowContainer = styled.div<TableBodyRowContainerProps>(
  (props) => ({
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: backgroundColor(props),
    color: props.highlighted ? theme.white : theme.textColorPrimary,
    '& *': {
      color: props.highlighted ? `${theme.white} !important` : undefined,
    },
    '& img': {
      backgroundColor: props.highlighted
        ? `${theme.white} !important`
        : undefined,
    },
    minHeight: DEFAULT_ROW_HEIGHT,
    overflow: 'hidden',
    width: '100%',
    flexShrink: 0,
    [`&:hover ${RowContextMenu}`]: {
      visibility: 'visible',
      color: props.highlighted ? theme.white : undefined,
    },
  }),
);
TableBodyRowContainer.displayName = 'TableRow:TableBodyRowContainer';

const TableBodyColumnContainer = styled.div<{
  width: Width;
  multiline?: boolean;
  justifyContent: 'left' | 'right' | 'center' | 'flex-start';
}>((props) => ({
  display: 'flex',
  flexShrink: props.width === undefined ? 1 : 0,
  flexGrow: props.width === undefined ? 1 : 0,
  overflow: 'hidden',
  padding: `0 ${theme.space.small}px`,
  verticalAlign: 'top',
  whiteSpace: props.multiline ? 'normal' : 'nowrap',
  wordWrap: props.multiline ? 'break-word' : 'normal',
  width: props.width,
  justifyContent: props.justifyContent,
  borderBottom: `1px solid ${theme.dividerColor}`,
}));
TableBodyColumnContainer.displayName = 'TableRow:TableBodyColumnContainer';

type Props = {
  config: RenderContext<any>;
  highlighted: boolean;
  value: any;
  itemIndex: number;
};

export const TableRow = memo(function TableRow(props: Props) {
  const {config, highlighted, value: row} = props;
  const menu = useContext(TableContextMenuContext);

  return (
    <TableBodyRowContainer
      highlighted={highlighted}
      data-key={row.key}
      onClick={(e) => {
        e.stopPropagation();
        props.config.onClick(props.value, props.itemIndex);
      }}>
      {config.columns
        .filter((col) => col.visible)
        .map((col) => {
          const value = (col as any).onRender
            ? (col as any).onRender(row)
            : normalizeCellValue((row as any)[col.key]);

          return (
            <TableBodyColumnContainer
              className="ant-table-cell"
              key={col.key as string}
              multiline={col.wrap}
              justifyContent={col.align ? col.align : 'flex-start'}
              width={col.width}>
              {value}
            </TableBodyColumnContainer>
          );
        })}
      {menu && (
        <Dropdown
          overlay={menu(row)}
          placement="bottomRight"
          trigger={['click', 'contextMenu']}>
          <RowContextMenu />
        </Dropdown>
      )}
    </TableBodyRowContainer>
  );
});

export function normalizeCellValue(value: any): string {
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return '' + value;
    case 'undefined':
      return '';
    case 'string':
      return value;
    case 'object': {
      if (value === null) return '';
      if (value instanceof Date) {
        return (
          value.toTimeString().split(' ')[0] +
          '.' +
          pad('' + value.getMilliseconds(), 3)
        );
      }
      return JSON.stringify(value, null, 2);
    }
    default:
      return '<unrenderable value>';
  }
}
