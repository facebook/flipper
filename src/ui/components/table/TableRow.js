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

const TableBodyRowContainer = FlexRow.extends(
  {
    backgroundColor: props => {
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
    },
    boxShadow: props => (props.zebra ? 'none' : 'inset 0 -1px #E9EBEE'),
    color: props =>
      props.highlighted ? colors.white : props.color || 'inherit',
    '& *': {
      color: props => (props.highlighted ? `${colors.white} !important` : null),
    },
    '& img': {
      backgroundColor: props =>
        props.highlighted ? `${colors.white} !important` : 'none',
    },
    height: props => (props.multiline ? 'auto' : props.rowLineHeight),
    lineHeight: props =>
      `${String(props.rowLineHeight || DEFAULT_ROW_HEIGHT)}px`,
    fontWeight: props => props.fontWeight || 'inherit',
    overflow: 'hidden',
    width: '100%',
    userSelect: 'none',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: props =>
        !props.highlighted && props.highlightOnHover ? colors.light02 : 'none',
    },
  },
  {
    ignoreAttributes: [
      'highlightedBackgroundColor',
      'highlightOnHover',
      'backgroundColor',
      'rowLineHeight',
      'highlighted',
      'multiline',
      'hasHover',
      'zebra',
      'even',
    ],
  },
);

const TableBodyColumnContainer = styled.view(
  {
    display: 'flex',
    flexShrink: props => (props.width === 'flex' ? 1 : 0),
    overflow: 'hidden',
    padding: '0 8px',
    userSelect: 'none',
    textOverflow: 'ellipsis',
    verticalAlign: 'top',
    whiteSpace: props => (props.multiline ? 'normal' : 'nowrap'),
    wordWrap: props => (props.multiline ? 'break-word' : 'normal'),
    width: props => (props.width === 'flex' ? '100%' : props.width),
    maxWidth: '100%',
  },
  {
    ignoreAttributes: ['multiline', 'width'],
  },
);

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

          if (col == null) {
            throw new Error(
              `Trying to access column "${key}" which does not exist on row. Make sure buildRow is returning a valid row.`,
            );
          }
          const isFilterable = col.isFilterable || false;
          const value = col ? col.value : '';
          const title = col ? col.title : '';

          return (
            <TableBodyColumnContainer
              key={key}
              title={title}
              multiline={multiline}
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
