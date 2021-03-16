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
import {Property} from 'csstype';
import {theme} from 'flipper-plugin';
import {RenderingConfig} from './DataTable';

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
    color: props.highlighted ? theme.white : theme.primaryColor,
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
  width?: any;
  multiline?: boolean;
  justifyContent: Property.JustifyContent;
}>((props) => ({
  display: 'flex',
  flexShrink: props.width === 'flex' ? 1 : 0,
  flexGrow: props.width === 'flex' ? 1 : 0,
  overflow: 'hidden',
  padding: `0 ${theme.space.small}px`,
  verticalAlign: 'top',
  whiteSpace: props.multiline ? 'normal' : 'nowrap',
  wordWrap: props.multiline ? 'break-word' : 'normal',
  width: props.width === 'flex' ? undefined : props.width,
  justifyContent: props.justifyContent,
}));
TableBodyColumnContainer.displayName = 'TableRow:TableBodyColumnContainer';

type Props = {
  config: RenderingConfig<any>;
  highlighted: boolean;
  row: any;
};

export const TableRow = memo(function TableRow(props: Props) {
  const {config, highlighted, row} = props;
  return (
    <TableBodyRowContainer highlighted={highlighted} data-key={row.key}>
      {config.columns.map((col) => {
        const value = (col as any).onRender
          ? (col as any).onRender(row)
          : (row as any)[col.key] ?? '';

        return (
          <TableBodyColumnContainer
            key={col.key as string}
            multiline={col.wrap}
            justifyContent={col.align ? col.align : 'flex-start'}
            width={normaliseColumnWidth(col.width)}>
            {value}
          </TableBodyColumnContainer>
        );
      })}
    </TableBodyRowContainer>
  );
});

function normaliseColumnWidth(
  width: string | number | null | undefined | '*',
): number | string {
  if (width == null || width === '*') {
    // default
    return 'flex';
  }

  if (isPercentage(width)) {
    // percentage eg. 50%
    return width;
  }

  if (typeof width === 'number') {
    // pixel width
    return width;
  }

  throw new TypeError(`Unknown value ${width} for table column width`);
}

function isPercentage(width: any): boolean {
  return typeof width === 'string' && width[width.length - 1] === '%';
}
