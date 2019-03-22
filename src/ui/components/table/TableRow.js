/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableColumnKeys,
  TableColumnSizes,
  TableOnAddFilter,
  TableBodyRow,
} from './types.js';

import React from 'react';
import FilterRow from '../filter/FilterRow.js';
import styled from '../../styled/index.js';
import FlexRow from '../FlexRow.js';
import {colors} from '../colors.js';
import {normaliseColumnWidth} from './utils.js';
import {DEFAULT_ROW_HEIGHT} from './types';

const backgroundColor = props => {
  if (props.highlighted) {
    if (props.highlightedBackgroundColor) {
      return props.highlightedBackgroundColor;
    } else {
      return colors.macOSTitleBarIconSelected;
    }
  } else {
    if (props.backgroundColor) {
      return props.backgroundColor;
    } else if (props.even && props.zebra) {
      return colors.light02;
    } else {
      return 'transparent';
    }
  }
};

const TableBodyRowContainer = styled(FlexRow)(props => ({
  backgroundColor: backgroundColor(props),
  boxShadow: props.zebra ? 'none' : 'inset 0 -1px #E9EBEE',
  color: props.highlighted ? colors.white : props.color || 'inherit',
  '& *': {
    color: props.highlighted ? `${colors.white} !important` : null,
  },
  '& img': {
    backgroundColor: props.highlighted ? `${colors.white} !important` : 'none',
  },
  height: props.multiline ? 'auto' : props.rowLineHeight,
  lineHeight: `${String(props.rowLineHeight || DEFAULT_ROW_HEIGHT)}px`,
  fontWeight: props.fontWeight || 'inherit',
  overflow: 'hidden',
  width: '100%',
  userSelect: 'none',
  flexShrink: 0,
  '&:hover': {
    backgroundColor:
      !props.highlighted && props.highlightOnHover ? colors.light02 : 'none',
  },
}));

const TableBodyColumnContainer = styled('div')(props => ({
  display: 'flex',
  flexShrink: props.width === 'flex' ? 1 : 0,
  overflow: 'hidden',
  padding: '0 8px',
  userSelect: 'none',
  textOverflow: 'ellipsis',
  verticalAlign: 'top',
  whiteSpace: props.multiline ? 'normal' : 'nowrap',
  wordWrap: props.multiline ? 'break-word' : 'normal',
  width: props.width === 'flex' ? '100%' : props.width,
  maxWidth: '100%',
  justifyContent: props.justifyContent,
}));

type Props = {
  columnSizes: TableColumnSizes,
  columnKeys: TableColumnKeys,
  onMouseDown: (e: SyntheticMouseEvent<>) => mixed,
  onMouseEnter?: (e: SyntheticMouseEvent<>) => void,
  multiline: ?boolean,
  rowLineHeight: number,
  highlighted: boolean,
  row: TableBodyRow,
  index: number,
  style: ?Object,
  onAddFilter?: TableOnAddFilter,
  zebra: ?boolean,
};

export default class TableRow extends React.PureComponent<Props> {
  static defaultProps = {
    zebra: true,
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
      onMouseEnter,
      onMouseDown,
      zebra,
      onAddFilter,
    } = this.props;

    return (
      <TableBodyRowContainer
        rowLineHeight={rowLineHeight}
        highlightedBackgroundColor={row.highlightedBackgroundColor}
        backgroundColor={row.backgroundColor}
        highlighted={highlighted}
        multiline={multiline}
        even={index % 2 === 0}
        zebra={zebra}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        style={style}
        highlightOnHover={row.highlightOnHover}
        data-key={row.key}
        {...row.style}>
        {columnKeys.map(key => {
          const col = row.columns[key];

          const isFilterable = col?.isFilterable || false;
          const value = col?.value;
          const title = col?.title;

          return (
            <TableBodyColumnContainer
              key={key}
              title={title}
              multiline={multiline}
              justifyContent={col?.align || 'flex-start'}
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
