/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';
import Text from './Text';
import ManagedTable from './table/ManagedTable';
import FlexRow from './FlexRow';
import Glyph from './Glyph';
import styled from '@emotion/styled';
import React from 'react';
import {Property} from 'csstype';
import {
  TableBodyRow,
  TableColumnSizes,
  TableColumns,
  TableBodyColumn,
} from './table/types';
import {theme} from 'flipper-plugin';

const Padder = styled.div<{
  padded?: boolean;
  backgroundColor?: Property.BackgroundColor;
}>(({padded, backgroundColor}) => ({
  padding: padded ? 10 : 0,
  backgroundColor,
}));
Padder.displayName = 'StackTrace:Padder';

const Container = styled.div<{isCrash?: boolean; padded?: boolean}>(
  ({isCrash, padded}) => ({
    border: padded
      ? `1px solid ${isCrash ? theme.errorColor : theme.dividerColor}`
      : 'none',
    borderRadius: padded ? 5 : 0,
    overflow: 'hidden',
  }),
);
Container.displayName = 'StackTrace:Container';

const Title = styled(FlexRow)<{isCrash?: boolean}>(({isCrash}) => ({
  color: isCrash ? theme.errorColor : 'inherit',
  padding: 8,
  alignItems: 'center',
  minHeight: 32,
}));
Title.displayName = 'StackTrace:Title';

const Reason = styled(Text)<{isCrash?: boolean}>(({isCrash}) => ({
  color: isCrash ? theme.errorColor : theme.textColorPrimary,
  fontWeight: 'bold',
  fontSize: 13,
}));
Reason.displayName = 'StackTrace:Reason';

const Line = styled(Text)<{
  isCrash?: boolean;
  isBold?: boolean;
  color?: string;
}>(({isBold, color}) => ({
  color: color ?? theme.textColorPrimary,
  fontWeight: isBold ? 'bold' : 'normal',
  overflow: 'visible',
}));
Line.displayName = 'StackTrace:Line';

const Icon = styled(Glyph)({marginRight: 5});
Icon.displayName = 'StackTrace:Icon';

const COLUMNS = {
  lineNumber: 40,
  address: 150,
  library: 150,
  message: 'flex',
  caller: 200,
};

type Child = {
  isBold?: boolean;
  library?: string | null | undefined;
  address?: string | null | undefined;
  caller?: string | null | undefined;
  lineNumber?: string | null | undefined;
  message?: string | null | undefined;
};

/**
 * Display a stack trace
 */
export default class StackTrace extends Component<{
  children: Child[];
  /**
   * Reason for the crash, displayed above the trace
   */
  reason?: string;
  /**
   * Does the trace show a crash
   */
  isCrash?: boolean;
  /**
   * Display the stack trace in a padded container
   */
  padded?: boolean;
  /**
   * Background color of the stack trace
   */
  backgroundColor?: string;
}> {
  render() {
    const {children} = this.props;
    if (!children || children.length === 0) {
      return null;
    }

    const columns = (
      Object.keys(children[0]) as Array<keyof Child>
    ).reduce<TableColumns>((acc, cv) => {
      if (cv !== 'isBold') {
        acc[cv] = {
          value: cv,
        };
      }
      return acc;
    }, {});

    const columnOrder = Object.keys(COLUMNS).map((key) => ({
      key,
      visible: Boolean(columns[key]),
    }));

    const columnSizes = (
      Object.keys(COLUMNS) as Array<keyof typeof COLUMNS>
    ).reduce<TableColumnSizes>((acc, cv: keyof typeof COLUMNS) => {
      acc[cv] =
        COLUMNS[cv] === 'flex'
          ? 'flex'
          : children.reduce(
              (acc, line) =>
                Math.max(acc, line[cv] ? line[cv]!.length : 0 || 0),
              0,
            ) *
              8 +
            16; // approx 8px per character + 16px padding left/right

      return acc;
    }, {});

    const colorForColumn = (column: string): string | undefined => {
      switch (column) {
        case 'lineNumber':
          return theme.semanticColors.numberValue;
        case 'library':
          return theme.textColorPrimary;
        case 'address':
          return theme.semanticColors.stringValue;
        case 'caller':
          return theme.textColorSecondary;
      }
    };
    const rows: TableBodyRow[] = children.map((l, i) => ({
      key: String(i),
      columns: (Object.keys(columns) as Array<keyof Child>).reduce<{
        [key: string]: TableBodyColumn;
      }>((acc, cv) => {
        acc[cv] = {
          align: cv === 'lineNumber' ? 'right' : 'left',
          value: (
            <Line
              code
              isCrash={this.props.isCrash}
              bold={l.isBold || false}
              color={colorForColumn(cv)}>
              {String(l[cv])}
            </Line>
          ),
        };
        return acc;
      }, {}),
    }));

    return (
      <Padder
        padded={this.props.padded}
        backgroundColor={this.props.backgroundColor}>
        <Container isCrash={this.props.isCrash} padded={this.props.padded}>
          {this.props.reason && (
            <Title isCrash={this.props.isCrash}>
              {this.props.isCrash && (
                <Icon
                  name="stop"
                  variant="filled"
                  size={16}
                  color={theme.errorColor}
                />
              )}
              <Reason isCrash={this.props.isCrash} code>
                {this.props.reason}
              </Reason>
            </Title>
          )}
          <ManagedTable
            columns={columns}
            rows={rows}
            hideHeader
            autoHeight
            zebra={false}
            columnOrder={columnOrder}
            columnSizes={columnSizes}
            highlightableRows={false}
          />
        </Container>
      </Padder>
    );
  }
}
