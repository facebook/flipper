/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from 'react-emotion';
import {colors} from './colors';
import {Component} from 'react';
import PropTypes from 'prop-types';
import {
  TopProperty,
  LeftProperty,
  BottomProperty,
  RightProperty,
  BackgroundColorProperty,
  LineHeightProperty,
  PaddingProperty,
  BorderRadiusProperty,
  MaxWidthProperty,
  ColorProperty,
  WidthProperty,
} from 'csstype';
import React from 'react';

const defaultOptions = {
  backgroundColor: colors.blueGrey,
  position: 'below',
  color: colors.white,
  showTail: true,
  maxWidth: '200px',
  width: 'auto',
  borderRadius: 4,
  padding: '6px',
  lineHeight: '20px',
  delay: 0,
};

export type TooltipOptions = {
  backgroundColor?: string;
  position?: 'below' | 'above' | 'toRight' | 'toLeft';
  color?: string;
  showTail?: boolean;
  maxWidth?: string;
  width?: string;
  borderRadius?: number;
  padding?: string;
  lineHeight?: string;
  delay?: number; // in milliseconds
};

const TooltipBubble = styled('div')(
  (props: {
    top: TopProperty<number>;
    left: LeftProperty<number>;
    bottom: BottomProperty<number>;
    right: RightProperty<number>;
    options: {
      backgroundColor: BackgroundColorProperty;
      lineHeight: LineHeightProperty<number>;
      padding: PaddingProperty<number>;
      borderRadius: BorderRadiusProperty<number>;
      width: WidthProperty<number>;
      maxWidth: MaxWidthProperty<number>;
      color: ColorProperty;
    };
  }) => ({
    position: 'absolute',
    zIndex: 99999999999,
    backgroundColor: props.options.backgroundColor,
    lineHeight: props.options.lineHeight,
    padding: props.options.padding,
    borderRadius: props.options.borderRadius,
    width: props.options.width,
    maxWidth: props.options.maxWidth,
    top: props.top,
    left: props.left,
    bottom: props.bottom,
    right: props.right,
    color: props.options.color,
  }),
);

// vertical offset on bubble when position is 'below'
const BUBBLE_BELOW_POSITION_VERTICAL_OFFSET = -10;
// horizontal offset on bubble when position is 'toLeft' or 'toRight'
const BUBBLE_LR_POSITION_HORIZONTAL_OFFSET = 5;
// offset on bubble when tail is showing
const BUBBLE_SHOWTAIL_OFFSET = 5;
// horizontal offset on tail when position is 'above' or 'below'
const TAIL_AB_POSITION_HORIZONTAL_OFFSET = 15;
// vertical offset on tail when position is 'toLeft' or 'toRight'
const TAIL_LR_POSITION_HORIZONTAL_OFFSET = 5;

const TooltipTail = styled('div')(
  (props: {
    top: TopProperty<number>;
    left: LeftProperty<number>;
    bottom: BottomProperty<number>;
    right: RightProperty<number>;
    options: {
      backgroundColor: BackgroundColorProperty;
    };
  }) => ({
    position: 'absolute',
    display: 'block',
    whiteSpace: 'pre',
    height: '10px',
    width: '10px',
    lineHeight: '0',
    zIndex: 99999999998,
    transform: 'rotate(45deg)',
    backgroundColor: props.options.backgroundColor,
    top: props.top,
    left: props.left,
    bottom: props.bottom,
    right: props.right,
  }),
);

type TooltipProps = {
  children: React.ReactNode;
};

type TooltipObject = {
  rect: ClientRect;
  title: React.ReactNode;
  options: TooltipOptions;
};

type TooltipState = {
  tooltip: TooltipObject | null | undefined;
  timeoutID: ReturnType<typeof setTimeout> | null | undefined;
};

export default class TooltipProvider extends Component<
  TooltipProps,
  TooltipState
> {
  static childContextTypes = {
    TOOLTIP_PROVIDER: PropTypes.object,
  };

  state = {
    tooltip: null,
    timeoutID: undefined,
  };

  getChildContext() {
    return {TOOLTIP_PROVIDER: this};
  }

  open(
    container: HTMLDivElement,
    title: React.ReactNode,
    options: TooltipOptions,
  ) {
    const node = container.childNodes[0];
    if (node == null || !(node instanceof HTMLElement)) {
      return;
    }

    if (options.delay) {
      this.state.timeoutID = setTimeout(() => {
        this.setState({
          tooltip: {
            rect: node.getBoundingClientRect(),
            title,
            options: options,
          },
        });
      }, options.delay);
      return;
    }

    this.setState({
      tooltip: {
        rect: node.getBoundingClientRect(),
        title,
        options: options,
      },
    });
  }

  close() {
    if (this.state.timeoutID) {
      clearTimeout(this.state.timeoutID);
    }
    this.setState({tooltip: null});
  }

  getTooltipTail(tooltip: TooltipObject) {
    const opts = Object.assign(defaultOptions, tooltip.options);
    if (!opts.showTail) {
      return null;
    }

    let left: LeftProperty<number> = 'auto';
    let top: TopProperty<number> = 'auto';
    let bottom: BottomProperty<number> = 'auto';
    let right: RightProperty<number> = 'auto';

    if (opts.position === 'below') {
      left = tooltip.rect.left + TAIL_AB_POSITION_HORIZONTAL_OFFSET;
      top = tooltip.rect.bottom;
    } else if (opts.position === 'above') {
      left = tooltip.rect.left + TAIL_AB_POSITION_HORIZONTAL_OFFSET;
      bottom = window.innerHeight - tooltip.rect.top;
    } else if (opts.position === 'toRight') {
      left = tooltip.rect.right + TAIL_LR_POSITION_HORIZONTAL_OFFSET;
      top = tooltip.rect.top;
    } else if (opts.position === 'toLeft') {
      right =
        window.innerWidth -
        tooltip.rect.left +
        TAIL_LR_POSITION_HORIZONTAL_OFFSET;
      top = tooltip.rect.top;
    }

    return (
      <TooltipTail
        key="tail"
        top={top}
        left={left}
        bottom={bottom}
        right={right}
        options={opts}
      />
    );
  }

  getTooltipBubble(tooltip: TooltipObject) {
    const opts = Object.assign(defaultOptions, tooltip.options);
    let left: LeftProperty<number> = 'auto';
    let top: TopProperty<number> = 'auto';
    let bottom: BottomProperty<number> = 'auto';
    let right: RightProperty<number> = 'auto';

    if (opts.position === 'below') {
      left = tooltip.rect.left;
      top = tooltip.rect.bottom;
      if (opts.showTail) {
        top += BUBBLE_SHOWTAIL_OFFSET;
      }
    } else if (opts.position === 'above') {
      bottom = window.innerHeight - tooltip.rect.top;
      if (opts.showTail) {
        bottom += BUBBLE_SHOWTAIL_OFFSET;
      }
      left = tooltip.rect.left;
    } else if (opts.position === 'toRight') {
      left = tooltip.rect.right + BUBBLE_LR_POSITION_HORIZONTAL_OFFSET;
      if (opts.showTail) {
        left += BUBBLE_SHOWTAIL_OFFSET;
      }
      top = tooltip.rect.top + BUBBLE_BELOW_POSITION_VERTICAL_OFFSET;
    } else if (opts.position === 'toLeft') {
      right =
        window.innerWidth -
        tooltip.rect.left +
        BUBBLE_LR_POSITION_HORIZONTAL_OFFSET;
      if (opts.showTail) {
        right += BUBBLE_SHOWTAIL_OFFSET;
      }
      top = tooltip.rect.top + BUBBLE_BELOW_POSITION_VERTICAL_OFFSET;
    }

    return (
      <TooltipBubble
        key="bubble"
        top={top}
        left={left}
        bottom={bottom}
        right={right}
        options={opts}>
        {tooltip.title}
      </TooltipBubble>
    );
  }

  getTooltipElement() {
    const {tooltip} = this.state;
    return (
      tooltip &&
      tooltip.title && [
        this.getTooltipTail(tooltip),
        this.getTooltipBubble(tooltip),
      ]
    );
  }

  render() {
    return [this.getTooltipElement(), this.props.children];
  }
}
