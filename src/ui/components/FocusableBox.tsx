/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';
import Box from './Box';
import {colors} from './colors';
import styled from '@emotion/styled';
import React from 'react';

const FocusableBoxBorder = styled(Box)({
  border: `1px solid ${colors.highlight}`,
  bottom: '0',
  left: '0',
  pointerEvents: 'none',
  position: 'absolute',
  right: '0',
  top: '0',
});
FocusableBoxBorder.displayName = 'FocusableBox:FocusableBoxBorder';

type Props = {
  onBlur?: (e: React.FocusEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  focusable?: boolean;
};

export default class FocusableBox extends Component<
  Props,
  {
    focused: boolean;
  }
> {
  constructor(props: Props, context: Object) {
    super(props, context);
    this.state = {focused: false};
  }

  static defaultProps = {
    focusable: true,
  };

  onBlur = (e: React.FocusEvent) => {
    const {onBlur} = this.props;
    if (onBlur) {
      onBlur(e);
    }
    if (this.state.focused) {
      this.setState({focused: false});
    }
  };

  onFocus = (e: React.FocusEvent) => {
    const {onFocus} = this.props;
    if (onFocus) {
      onFocus(e);
    }
    if (this.props.focusable) {
      this.setState({focused: true});
    }
  };

  render() {
    const {props} = this;

    return (
      <Box {...props} onFocus={this.onFocus} onBlur={this.onBlur} tabIndex={0}>
        {props.children}
        {this.state.focused && <FocusableBoxBorder />}
      </Box>
    );
  }
}
