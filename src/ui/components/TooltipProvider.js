/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import {Component} from 'react';

const PropTypes = require('prop-types');

const TooltipBubble = styled.view(
  {
    backgroundColor: '#000',
    lineHeight: '25px',
    padding: '0 6px',
    borderRadius: 4,
    position: 'absolute',
    width: 'auto',
    top: props => props.top,
    left: props => props.left,
    zIndex: 99999999999,
    pointerEvents: 'none',
    color: '#fff',
    marginTop: '-30px',
  },
  {
    ignoreAttributes: ['top', 'left'],
  },
);

type TooltipProps = {
  children: React$Node,
};

type TooltipState = {
  tooltip: ?{
    rect: ClientRect,
    title: React$Node,
  },
};

export default class TooltipProvider extends Component<
  TooltipProps,
  TooltipState,
> {
  static childContextTypes = {
    TOOLTIP_PROVIDER: PropTypes.object,
  };

  state = {
    tooltip: null,
  };

  getChildContext() {
    return {TOOLTIP_PROVIDER: this};
  }

  open(container: HTMLDivElement, title: React$Node) {
    const node = container.childNodes[0];
    if (node == null || !(node instanceof HTMLElement)) {
      return;
    }

    this.setState({
      tooltip: {
        rect: node.getBoundingClientRect(),
        title,
      },
    });
  }

  close() {
    this.setState({tooltip: null});
  }

  render() {
    const {tooltip} = this.state;

    let tooltipElem = null;
    if (tooltip != null) {
      tooltipElem = (
        <TooltipBubble top={tooltip.rect.top} left={tooltip.rect.left}>
          {tooltip.title}
        </TooltipBubble>
      );
    }

    return [tooltipElem, this.props.children];
  }
}
