/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {theme, _Interactive, _InteractiveProps} from 'flipper-plugin';
import FlexColumn from './FlexColumn';
import {colors} from './colors';
import {Component} from 'react';
import styled from '@emotion/styled';
import {Property} from 'csstype';
import React from 'react';

const SidebarInteractiveContainer = styled(_Interactive)<_InteractiveProps>({
  flex: 'none',
});
SidebarInteractiveContainer.displayName = 'Sidebar:SidebarInteractiveContainer';

type SidebarPosition = 'left' | 'top' | 'right' | 'bottom';

const borderStyle = '1px solid ' + theme.dividerColor;

const SidebarContainer = styled(FlexColumn)<{
  position: 'right' | 'top' | 'left' | 'bottom';
  backgroundColor?: Property.BackgroundClip;
  overflow?: boolean;
  unstyled?: boolean;
}>((props) => ({
  ...(props.unstyled
    ? undefined
    : {
        backgroundColor:
          props.backgroundColor || colors.macOSTitleBarBackgroundBlur,
        borderLeft: props.position === 'right' ? borderStyle : 'none',
        borderTop: props.position === 'bottom' ? borderStyle : 'none',
        borderRight: props.position === 'left' ? borderStyle : 'none',
        borderBottom: props.position === 'top' ? borderStyle : 'none',
      }),
  height: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
  textOverflow: props.overflow ? 'ellipsis' : 'auto',
  whiteSpace: props.overflow ? 'nowrap' : 'normal',
}));
SidebarContainer.displayName = 'Sidebar:SidebarContainer';

type SidebarProps = {
  /**
   * Position of the sidebar.
   */
  position: SidebarPosition;

  /**
   * Default width of the sidebar.  Only used for left/right sidebars.
   */
  width?: number;
  /**
   * Minimum sidebar width. Only used for left/right sidebars.
   */
  minWidth?: number;
  /**
   * Maximum sidebar width. Only used for left/right sidebars.
   */
  maxWidth?: number;

  /**
   * Default height of the sidebar.
   */
  height?: number;
  /**
   * Minimum sidebar height. Only used for top/bottom sidebars.
   */
  minHeight?: number;
  /**
   * Maximum sidebar height. Only used for top/bottom sidebars.
   */
  maxHeight?: number;

  /**
   * Background color.
   */
  backgroundColor?: Property.BackgroundColor;
  /**
   * Callback when the sidebar size ahs changed.
   */
  onResize?: (width: number, height: number) => void;
  /**
   * Contents of the sidebar.
   */
  children?: React.ReactNode;
  /**
   * Class name to customise styling.
   */
  className?: string;
};

type SidebarState = {
  width?: Property.Width<number>;
  height?: Property.Height<number>;
  userChange: boolean;
};

/**
 * A resizable sidebar.
 * @deprecated use Layout.Top / Right / Bottom / Left from flipper-plugin instead
 */
export default class Sidebar extends Component<SidebarProps, SidebarState> {
  constructor(props: SidebarProps, context: Object) {
    super(props, context);
    this.state = {
      userChange: false,
      width: props.width,
      height: props.height,
    };
  }

  static defaultProps = {
    position: 'left',
  };

  static getDerivedStateFromProps(
    nextProps: SidebarProps,
    state: SidebarState,
  ) {
    if (!state.userChange) {
      return {width: nextProps.width, height: nextProps.height};
    }
    return null;
  }

  onResize = (width: number, height: number) => {
    const {onResize} = this.props;
    if (onResize) {
      onResize(width, height);
    } else {
      this.setState({userChange: true, width, height});
    }
  };

  render() {
    const {backgroundColor, onResize, position, children} = this.props;
    let height: number | undefined;
    let minHeight: number | undefined;
    let maxHeight: number | undefined;
    let width: number | undefined;
    let minWidth: number | undefined;
    let maxWidth: number | undefined;

    const resizable: {[key: string]: boolean} = {};
    if (position === 'left') {
      resizable.right = true;
      ({width, minWidth, maxWidth} = this.props);
    } else if (position === 'top') {
      resizable.bottom = true;
      ({height, minHeight, maxHeight} = this.props);
    } else if (position === 'right') {
      resizable.left = true;
      ({width, minWidth, maxWidth} = this.props);
    } else if (position === 'bottom') {
      resizable.top = true;
      ({height, minHeight, maxHeight} = this.props);
    }

    const horizontal = position === 'left' || position === 'right';
    const gutterWidth = 0;

    if (horizontal) {
      width = width == null ? 200 : width;
      minWidth = (minWidth == null ? 100 : minWidth) + gutterWidth;
      maxWidth = maxWidth == null ? 600 : maxWidth;
    } else {
      height = height == null ? 200 : height;
      minHeight = minHeight == null ? 100 : minHeight;
      maxHeight = maxHeight == null ? 600 : maxHeight;
    }
    return (
      <SidebarInteractiveContainer
        className={this.props.className}
        minWidth={minWidth}
        maxWidth={maxWidth}
        width={
          horizontal
            ? !children
              ? gutterWidth
              : onResize
              ? width
              : this.state.width
            : undefined
        }
        minHeight={minHeight}
        maxHeight={maxHeight}
        height={
          !horizontal ? (onResize ? height : this.state.height) : undefined
        }
        resizable={resizable}
        onResize={this.onResize}>
        <SidebarContainer position={position} backgroundColor={backgroundColor}>
          {children}
        </SidebarContainer>
      </SidebarInteractiveContainer>
    );
  }
}
