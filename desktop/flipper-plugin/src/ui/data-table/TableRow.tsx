/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties, memo} from 'react';
import styled from '@emotion/styled';
import {theme} from '../theme';
import {DataTableColumn, TableRowRenderContext} from './DataTable';
import {Width} from '../../utils/widthUtils';
import {DataFormatter} from '../DataFormatter';
import {Dropdown} from 'antd';
import {contextMenuTrigger} from '../data-inspector/DataInspectorNode';

// heuristic for row estimation, should match any future styling updates
export const DEFAULT_ROW_HEIGHT = 24;

type TableBodyRowContainerProps = {
  highlighted?: boolean;
};

const backgroundColor = (props: TableBodyRowContainerProps) => {
  if (props.highlighted) {
    return theme.backgroundWash;
  }
  return undefined;
};

const CircleMargin = 4;
const RowContextMenuWrapper = styled.div({
  position: 'absolute',
  top: 0,
  right: 0,
  paddingRight: CircleMargin,
  fontSize: DEFAULT_ROW_HEIGHT - CircleMargin * 2,
  color: theme.primaryColor,
  cursor: 'pointer',
  visibility: 'hidden',
});

const TableBodyRowContainer = styled.div<TableBodyRowContainerProps>(
  (props) => ({
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: backgroundColor(props),
    borderLeft: props.highlighted
      ? `4px solid ${theme.primaryColor}`
      : `4px solid transparent`,
    borderBottom: `1px solid ${theme.dividerColor}`,
    paddingTop: 1,
    minHeight: DEFAULT_ROW_HEIGHT,
    lineHeight: `${DEFAULT_ROW_HEIGHT - 2}px`,
    '& .anticon': {
      lineHeight: `${DEFAULT_ROW_HEIGHT - 2}px`,
    },
    overflow: 'hidden',
    width: '100%',
    flexShrink: 0,
    [`&:hover ${RowContextMenuWrapper}`]: {
      visibility: 'visible',
    },
  }),
);
TableBodyRowContainer.displayName = 'TableRow:TableBodyRowContainer';

const TableBodyColumnContainer = styled.div<{
  width: Width;
  multiline?: boolean;
  justifyContent: 'left' | 'right' | 'center';
}>((props) => ({
  display: 'block',
  flexShrink: props.width === undefined ? 1 : 0,
  flexGrow: props.width === undefined ? 1 : 0,
  overflow: 'hidden',
  padding: `0 ${theme.space.small}px`,
  verticalAlign: 'top',
  // pre-wrap preserves explicit newlines and whitespace, and wraps as well when needed
  whiteSpace: props.multiline ? 'pre-wrap' : 'nowrap',
  wordWrap: props.multiline ? 'break-word' : 'normal',
  width: props.width,
  textAlign: props.justifyContent,
  justifyContent: props.justifyContent,
  '&::selection': {
    color: 'inherit',
    backgroundColor: theme.buttonDefaultBackground,
  },
  '& p': {
    margin: 0,
  },
}));
TableBodyColumnContainer.displayName = 'TableRow:TableBodyColumnContainer';

type TableRowProps<T> = {
  config: TableRowRenderContext<any>;
  highlighted: boolean;
  record: T;
  itemIndex: number;
  style?: CSSProperties;
};

export const TableRow = memo(function TableRow<T>({
  record,
  itemIndex,
  highlighted,
  config,
}: TableRowProps<T>) {
  const row = (
    <TableBodyRowContainer
      highlighted={highlighted}
      onMouseDown={(e) => {
        config.onMouseDown(e, record, itemIndex);
      }}
      onMouseEnter={(e) => {
        config.onMouseEnter(e, record, itemIndex);
      }}
      style={config.onRowStyle?.(record)}>
      {config.columns
        .filter((col) => col.visible)
        .map((col) => {
          const value = renderColumnValue<T>(
            col,
            record,
            highlighted,
            itemIndex,
          );

          return (
            <TableBodyColumnContainer
              key={col.key as string}
              multiline={col.wrap}
              justifyContent={col.align ? col.align : 'left'}
              width={col.width}>
              {value}
            </TableBodyColumnContainer>
          );
        })}
    </TableBodyRowContainer>
  );
  if (config.onContextMenu) {
    return (
      <Dropdown overlay={config.onContextMenu} trigger={contextMenuTrigger}>
        {row}
      </Dropdown>
    );
  } else {
    return row;
  }
});

export function renderColumnValue<T>(
  col: DataTableColumn<any>,
  record: T,
  highlighted: boolean,
  itemIndex: number,
) {
  return col.onRender
    ? col.onRender(record, highlighted, itemIndex)
    : DataFormatter.format((record as any)[col.key], col.formatters);
}
