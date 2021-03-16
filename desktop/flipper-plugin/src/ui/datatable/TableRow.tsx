/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo} from 'react';
import styled from '@emotion/styled';
import {theme} from 'flipper-plugin';
import type {RenderContext} from './DataTable';
import {Width} from '../../utils/widthUtils';
import {pad} from 'lodash';

// heuristic for row estimation, should match any future styling updates
export const DEFAULT_ROW_HEIGHT = 24;

type TableBodyRowContainerProps = {
  highlighted?: boolean;
};

const backgroundColor = (props: TableBodyRowContainerProps) => {
  if (props.highlighted) {
    return theme.backgroundTransparentHover;
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
      : `4px solid ${theme.backgroundDefault}`,
    minHeight: DEFAULT_ROW_HEIGHT,
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
  '&::selection': {
    color: 'inherit',
    backgroundColor: theme.buttonDefaultBackground,
  },
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
  return (
    <TableBodyRowContainer
      highlighted={highlighted}
      data-key={row.key}
      onMouseDown={(e) => {
        props.config.onMouseDown(e, props.value, props.itemIndex);
      }}
      onMouseEnter={(e) => {
        props.config.onMouseEnter(e, props.value, props.itemIndex);
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
