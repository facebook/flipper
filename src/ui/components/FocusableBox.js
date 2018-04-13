/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import {Component} from 'react';
import Box from './Box.js';

const FocusableBoxBorder = Box.extends(
  {
    border: (props, theme) => `1px solid ${theme.accent}`,
    bottom: '0',
    left: '0',
    pointerEvents: 'none',
    position: 'absolute',
    right: '0',
    top: '0',
  },
  {
    ignoreAttributes: [],
  },
);

export default class FocusableBox extends Component<
  Object,
  {|
    focused: boolean,
  |},
> {
  constructor(props: Object, context: Object) {
    super(props, context);
    this.state = {focused: false};
  }

  static defaultProps = {
    focusable: true,
  };

  onBlur = (e: SyntheticFocusEvent<>) => {
    const {onBlur} = this.props;
    if (onBlur) {
      onBlur(e);
    }
    if (this.state.focused) {
      this.setState({focused: false});
    }
  };

  onFocus = (e: SyntheticFocusEvent<>) => {
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
      <Box {...props} onFocus={this.onFocus} onBlur={this.onBlur} tabIndex="0">
        {props.children}
        {this.state.focused && <FocusableBoxBorder />}
      </Box>
    );
  }
}
