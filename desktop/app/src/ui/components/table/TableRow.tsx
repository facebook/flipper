/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  TableColumnKeys,
  TableColumnSizes,
  TableOnAddFilter,
  TableBodyRow,
} from './types';
import React from 'react';
import FilterRow from '../filter/FilterRow';
import styled from '@emotion/styled';
import FlexRow from '../FlexRow';
import {colors} from '../colors';
import {normaliseColumnWidth} from './utils';
import {DEFAULT_ROW_HEIGHT} from './types';
import {
  FontWeightProperty,
  ColorProperty,
  JustifyContentProperty,
  BackgroundColorProperty,
} from 'csstype';

type TableBodyRowContainerProps = {
  even?: boolean;
  zebra?: boolean;
  highlighted?: boolean;
  rowLineHeight?: number;
  multiline?: boolean;
  fontWeight?: FontWeightProperty;
  color?: ColorProperty;
  highlightOnHover?: boolean;
  backgroundColor?: BackgroundColorProperty;
  highlightedBackgroundColor?: BackgroundColorProperty;
  zebraBackgroundColor?: BackgroundColorProperty;
};

const backgroundColor = (props: TableBodyRowContainerProps) => {
  if (props.highlighted) {
    if (props.highlightedBackgroundColor) {
      return props.highlightedBackgroundColor;
    } else {
      return colors.macOSTitleBarIconSelected;
    }
  } else {
    if (props.zebra && props.zebraBackgroundColor && props.backgroundColor) {
      return props.even ? props.zebraBackgroundColor : props.backgroundColor;
    } else if (props.backgroundColor) {
      return props.backgroundColor;
    } else if (props.even && props.zebra) {
      return colors.light02;
    } else {
      return 'transparent';
    }
  }
};

const TableBodyRowContainer = styled(FlexRow)<TableBodyRowContainerProps>(
  (props) => ({
    backgroundColor: backgroundColor(props),
    boxShadow: props.zebra ? 'none' : 'inset 0 -1px #E9EBEE',
    color: props.highlighted ? colors.white : props.color || undefined,
    '& *': {
      color: props.highlighted ? `${colors.white} !important` : undefined,
    },
    '& img': {
      backgroundColor: props.highlighted
        ? `${colors.white} !important`
        : undefined,
    },
    height: props.multiline ? 'auto' : props.rowLineHeight,
    lineHeight: `${String(props.rowLineHeight || DEFAULT_ROW_HEIGHT)}px`,
    fontWeight: props.fontWeight,
    overflow: 'hidden',
    width: '100%',
    flexShrink: 0,
    '&:hover': {
      backgroundColor:
        !props.highlighted && props.highlightOnHover ? colors.light02 : 'none',
    },
  }),
);
TableBodyRowContainer.displayName = 'TableRow:TableBodyRowContainer';

const TableBodyColumnContainer = styled.div<{
  width?: any;
  multiline?: boolean;
  justifyContent: JustifyContentProperty;
}>(
  (props: {
    width?: any;
    multiline?: boolean;
    justifyContent: JustifyContentProperty;
  }) => ({
    display: 'flex',
    flexShrink: props.width === 'flex' ? 1 : 0,
    overflow: 'hidden',
    padding: '0 8px',
    textOverflow: 'ellipsis',
    verticalAlign: 'top',
    whiteSpace: props.multiline ? 'normal' : 'nowrap',
    wordWrap: props.multiline ? 'break-word' : 'normal',
    width: props.width === 'flex' ? '100%' : props.width,
    maxWidth: '100%',
    justifyContent: props.justifyContent,
  }),
);
TableBodyColumnContainer.displayName = 'TableRow:TableBodyColumnContainer';

type Props = {
  columnSizes: TableColumnSizes;
  columnKeys: TableColumnKeys;
  onMouseDown: (e: React.MouseEvent, row: TableBodyRow, index: number) => void;
  onMouseEnter?: (
    e: React.MouseEvent,
    row: TableBodyRow,
    index: number,
  ) => void;
  multiline?: boolean;
  rowLineHeight: number;
  highlighted: boolean;
  row: TableBodyRow;
  index: number;
  style?: React.CSSProperties | undefined;
  onAddFilter?: TableOnAddFilter;
  zebra?: boolean;
};

export default class TableRow extends React.PureComponent<Props> {
  static defaultProps = {
    zebra: true,
  };

  handleMouseDown = (e: React.MouseEvent) => {
    this.props.onMouseDown(e, this.props.row, this.props.index);
  };

  handleMouseEnter = (e: React.MouseEvent) => {
    this.props.onMouseEnter?.(e, this.props.row, this.props.index);
  };

  render() {
    const {
      index,
      highlighted,
      rowLineHeight,
      row,
      style,
      multiline,
      columnKeys,
      columnSizes,
      zebra,
      onAddFilter,
    } = this.props;

    return (
      <TableBodyRowContainer
        rowLineHeight={rowLineHeight}
        highlightedBackgroundColor={row.highlightedBackgroundColor}
        backgroundColor={row.backgroundColor}
        zebraBackgroundColor={row.zebraBackgroundColor}
        highlighted={highlighted}
        multiline={multiline}
        even={index % 2 === 0}
        zebra={zebra}
        onMouseDown={this.handleMouseDown}
        onMouseEnter={this.handleMouseEnter}
        style={style}
        highlightOnHover={row.highlightOnHover}
        data-key={row.key}
        {...row.style}>
        {columnKeys.map((key) => {
          const col = row.columns[key];

          const isFilterable = Boolean(col && col.isFilterable);
          const value = col && col.value ? col.value : null;
          const title = col && col.title ? col.title : '';

          return (
            <TableBodyColumnContainer
              key={key}
              title={title}
              multiline={multiline}
              justifyContent={col && col.align ? col.align : 'flex-start'}
              width={normaliseColumnWidth(columnSizes[key])}>
              {isFilterable && onAddFilter != null ? (
                <FilterRow addFilter={onAddFilter} filterKey={key}>
                  {value}
                </FilterRow>
              ) : (
                value
              )}
            </TableBodyColumnContainer>
          );
        })}
      </TableBodyRowContainer>
    );
  }
}
