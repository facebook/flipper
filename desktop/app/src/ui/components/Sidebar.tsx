/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Interactive from './Interactive';
import FlexColumn from './FlexColumn';
import {colors} from './colors';
import {Component} from 'react';
import styled from '@emotion/styled';
import {
  BackgroundClipProperty,
  HeightProperty,
  WidthProperty,
  BackgroundColorProperty,
} from 'csstype';
import React from 'react';

const SidebarInteractiveContainer = styled(Interactive)({
  flex: 'none',
});
SidebarInteractiveContainer.displayName = 'Sidebar:SidebarInteractiveContainer';

type SidebarPosition = 'left' | 'top' | 'right' | 'bottom';

const SidebarContainer = styled(FlexColumn)<{
  position: 'right' | 'top' | 'left' | 'bottom';
  backgroundColor?: BackgroundClipProperty;
  overflow?: boolean;
}>((props) => ({
  backgroundColor: props.backgroundColor || colors.macOSTitleBarBackgroundBlur,
  borderLeft: props.position === 'right' ? '1px solid #b3b3b3' : 'none',
  borderTop: props.position === 'bottom' ? '1px solid #b3b3b3' : 'none',
  borderRight: props.position === 'left' ? '1px solid #b3b3b3' : 'none',
  borderBottom: props.position === 'top' ? '1px solid #b3b3b3' : 'none',
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
  backgroundColor?: BackgroundColorProperty;
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
  width?: WidthProperty<number>;
  height?: HeightProperty<number>;
  userChange: boolean;
};

/**
 * A resizable sidebar.
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

    if (horizontal) {
      width = width == null ? 200 : width;
      minWidth = minWidth == null ? 100 : minWidth;
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
        width={horizontal ? (onResize ? width : this.state.width) : undefined}
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
