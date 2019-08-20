/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import TooltipProvider, {TooltipOptions} from './TooltipProvider';
import styled from 'react-emotion';
import React, {Component} from 'react';
import PropTypes from 'prop-types';

const TooltipContainer = styled('div')({
  display: 'contents',
});

type TooltipProps = {
  /** Content shown in the tooltip */
  title: React.ReactNode;
  /** Component that will show the tooltip */
  children: React.ReactNode;
  options?: TooltipOptions;
};

type TooltipState = {
  open: boolean;
};

export default class Tooltip extends Component<TooltipProps, TooltipState> {
  static contextTypes = {
    TOOLTIP_PROVIDER: PropTypes.object,
  };

  context: {
    TOOLTIP_PROVIDER: TooltipProvider;
  };

  ref: HTMLDivElement | null;

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

  setRef = (ref: HTMLDivElement | null) => {
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
