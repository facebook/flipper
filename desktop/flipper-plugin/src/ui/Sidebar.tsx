/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout} from './Layout';
import {Component, ReactNode} from 'react';
import styled from '@emotion/styled';
import {Property} from 'csstype';
import React from 'react';
import {MoreOutlined} from '@ant-design/icons';
import {Interactive, InteractiveProps} from './Interactive';
import {theme} from './theme';

const SidebarInteractiveContainer = styled(Interactive)<InteractiveProps>({
  display: 'flex',
  flex: 1,
});
SidebarInteractiveContainer.displayName = 'Sidebar:SidebarInteractiveContainer';

type SidebarPosition = 'left' | 'top' | 'right' | 'bottom';

const borderStyle = `1px solid ${theme.dividerColor}`;

const SidebarContainer = styled(Layout.Container)<{
  position: 'right' | 'top' | 'left' | 'bottom';
  overflow?: boolean;
  unstyled?: boolean;
}>((props) => ({
  ...(props.unstyled
    ? undefined
    : {
        borderLeft: props.position === 'right' ? borderStyle : 'none',
        borderTop: props.position === 'bottom' ? borderStyle : 'none',
        borderRight: props.position === 'left' ? borderStyle : 'none',
        borderBottom: props.position === 'top' ? borderStyle : 'none',
        backgroundColor: theme.backgroundDefault,
      }),
  flex: 1,
  overflow: 'hidden',
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
  /**
   * use a Sandy themed large gutter
   */
  gutter?: boolean;
};

type SidebarState = {
  width?: Property.Width<number>;
  height?: Property.Height<number>;
  userChange: boolean;
};

/**
 * A resizable sidebar.
 */
export class Sidebar extends Component<SidebarProps, SidebarState> {
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
    const {onResize, position, children, gutter} = this.props;
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
    const gutterWidth = gutter ? theme.space.large : 0;

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
          !horizontal
            ? onResize
              ? height
              : this.state.height
            : gutter
            ? undefined
            : '100%'
        }
        resizable={resizable}
        onResize={this.onResize}
        gutterWidth={gutter ? theme.space.large : undefined}>
        <SidebarContainer position={position} unstyled={gutter}>
          {gutter ? (
            <GutterWrapper position={position}>{children}</GutterWrapper>
          ) : (
            children
          )}
        </SidebarContainer>
      </SidebarInteractiveContainer>
    );
  }
}

const GutterWrapper = ({
  position,
  children,
}: {
  position: SidebarPosition;
  children: ReactNode;
}) => {
  switch (position) {
    case 'right':
      return (
        <Layout.Left>
          <VerticalGutter enabled={!!children} />
          {children}
        </Layout.Left>
      );
    case 'left':
      return (
        <Layout.Right>
          {children}
          <VerticalGutter enabled={!!children} />
        </Layout.Right>
      );
    case 'bottom':
      // TODO: needs rotated styling
      return (
        <Layout.Top>
          <VerticalGutter enabled={!!children} />
          {children}
        </Layout.Top>
      );
    case 'top':
      // TODO: needs rotated styling
      return (
        <Layout.Bottom>
          {children}
          <VerticalGutter enabled={!!children} />
        </Layout.Bottom>
      );
  }
};

const VerticalGutterContainer = styled('div')<{enabled: boolean}>(
  ({enabled}) => ({
    width: theme.space.large,
    minWidth: theme.space.large,
    cursor: enabled ? undefined : 'default', // hide cursor from interactive container
    color: enabled ? theme.textColorPlaceholder : theme.backgroundWash,
    fontSize: '16px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    background: theme.backgroundWash,
    ':hover': {
      background: enabled ? theme.dividerColor : undefined,
    },
  }),
);
const VerticalGutter = ({enabled}: {enabled: boolean}) => (
  <VerticalGutterContainer enabled={enabled}>
    <MoreOutlined />
  </VerticalGutterContainer>
);
