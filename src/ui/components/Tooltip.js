/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type TooltipProvider from './TooltipProvider.js';
import type {TooltipOptions} from './TooltipProvider.js';

import styled from '../styled/index.js';
import {Component} from 'react';

const PropTypes = require('prop-types');

const TooltipContainer = styled('div')({
  display: 'contents',
});

type TooltipProps = {
  /** Content shown in the tooltip */
  title: React$Node,
  /** Component that will show the tooltip */
  children: React$Node,
  options?: TooltipOptions,
};

type TooltipState = {
  open: boolean,
};

export default class Tooltip extends Component<TooltipProps, TooltipState> {
  static contextTypes = {
    TOOLTIP_PROVIDER: PropTypes.object,
  };

  context: {
    TOOLTIP_PROVIDER: TooltipProvider,
  };

  ref: ?HTMLDivElement;

  state = {
    open: false,
  };

  componentWillUnmount() {
    if (this.state.open === true) {
      this.context.TOOLTIP_PROVIDER.close();
    }
  }

  onMouseEnter = () => {
    if (this.ref != null) {
      this.context.TOOLTIP_PROVIDER.open(
        this.ref,
        this.props.title,
        this.props.options || {},
      );
      this.setState({open: true});
    }
  };

  onMouseLeave = () => {
    this.context.TOOLTIP_PROVIDER.close();
    this.setState({open: false});
  };

  setRef = (ref: ?HTMLDivElement) => {
    this.ref = ref;
  };

  render() {
    return (
      <TooltipContainer
        innerRef={this.setRef}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}>
        {this.props.children}
      </TooltipContainer>
    );
  }
}
