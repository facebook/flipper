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
import {Width} from '../utils/widthUtils';
import {pad} from 'lodash';

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
  config: RenderContext;
  highlighted: boolean;
  row: any;
};

export const TableRow = memo(function TableRow(props: Props) {
  const {config, highlighted, row} = props;
  return (
    <TableBodyRowContainer
      highlighted={highlighted}
      data-key={row.key}
      className="ant-table-row">
      {config.columns
        .filter((col) => col.visible)
        .map((col) => {
          let value = (col as any).onRender
            ? (col as any).onRender(row)
            : (row as any)[col.key] ?? '';
          if (typeof value === 'boolean') {
            value = value ? 'true' : 'false';
          }

          if (value instanceof Date) {
            value =
              value.toTimeString().split(' ')[0] +
              '.' +
              pad('' + value.getMilliseconds(), 3);
          }

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
