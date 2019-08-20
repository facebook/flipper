/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import Text from './Text';
import {colors} from './colors.tsx';
import ManagedTable from './table/ManagedTable';
import FlexRow from './FlexRow';
import Glyph from './Glyph';
import styled from '../styled';

const Padder = styled('div')(({padded, backgroundColor}) => ({
  padding: padded ? 10 : 0,
  backgroundColor,
}));

const Container = styled('div')(({isCrash, padded}) => ({
  backgroundColor: isCrash ? colors.redTint : 'transprent',
  border: padded
    ? `1px solid ${isCrash ? colors.red : colors.light15}`
    : 'none',
  borderRadius: padded ? 5 : 0,
  overflow: 'hidden',
}));

const Title = styled(FlexRow)(({isCrash}) => ({
  color: isCrash ? colors.red : 'inherit',
  padding: 8,
  alignItems: 'center',
  minHeight: 32,
}));

const Reason = styled(Text)(({isCrash}) => ({
  color: isCrash ? colors.red : colors.light80,
  fontWeight: 'bold',
  fontSize: 13,
}));

const Line = styled(Text)(({isCrash, isBold}) => ({
  color: isCrash ? colors.red : colors.light80,
  fontWeight: isBold ? 'bold' : 'normal',
}));

const Icon = styled(Glyph)({marginRight: 5});

const COLUMNS = {
  lineNumber: 40,
  address: 150,
  library: 150,
  message: 'flex',
  caller: 200,
};

/**
 * Display a stack trace
 */
export default class StackTrace extends Component<{
  children: Array<{
    isBold?: boolean,
    library?: ?string,
    address?: ?string,
    caller?: ?string,
    lineNumber?: ?string,
    message?: ?string,
  }>,
  /**
   * Reason for the crash, displayed above the trace
   */
  reason?: string,
  /**
   * Does the trace show a crash
   */
  isCrash?: boolean,
  /**
   * Display the stack trace in a padded container
   */
  padded?: boolean,
  /**
   * Background color of the stack trace
   */
  backgroundColor?: string,
}> {
  render() {
    const {children} = this.props;
    if (!children || children.length === 0) {
      return null;
    }

    const columns = Object.keys(children[0]).reduce((acc, cv) => {
      if (cv !== 'isBold') {
        acc[cv] = {
          label: cv,
        };
      }
      return acc;
    }, {});

    const columnOrder = Object.keys(COLUMNS).map(key => ({
      key,
      visible: Boolean(columns[key]),
    }));

    const columnSizes = Object.keys(COLUMNS).reduce((acc, cv) => {
      acc[cv] =
        COLUMNS[cv] === 'flex'
          ? 'flex'
          : children.reduce(
              (acc, line) => Math.max(acc, line[cv]?.length || 0),
              0,
            ) *
              8 +
            16; // approx 8px per character + 16px padding left/right

      return acc;
    }, {});

    const rows = children.map((l, i) => ({
      key: i,
      columns: Object.keys(columns).reduce((acc, cv) => {
        acc[cv] = {
          align: cv === 'lineNumber' ? 'right' : 'left',
          value: (
            <Line code isCrash={this.props.isCrash} bold={l.isBold || false}>
              {l[cv]}
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
                  color={colors.red}
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
            hideHeader={true}
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
