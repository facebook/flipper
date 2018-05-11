/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {StyledComponent} from '../styled/index.js';
import Interactive from './Interactive.js';
import FlexColumn from './FlexColumn.js';
import {Component} from 'react';

const SidebarInteractiveContainer = Interactive.extends({
  flex: 'none',
});

type SidebarPosition = 'left' | 'top' | 'right' | 'bottom';

const SidebarContainer: StyledComponent<{
  position: SidebarPosition,
  overflow?: boolean,
}> = FlexColumn.extends(
  {
    backgroundColor: props => props.backgroundColor || '#f7f7f7',
    borderLeft: props =>
      props.position === 'right' ? '1px solid #b3b3b3' : 'none',
    borderTop: props =>
      props.position === 'bottom' ? '1px solid #b3b3b3' : 'none',
    borderRight: props =>
      props.position === 'left' ? '1px solid #b3b3b3' : 'none',
    borderBottom: props =>
      props.position === 'top' ? '1px solid #b3b3b3' : 'none',
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
    textOverflow: props => (props.overflow ? 'ellipsis' : 'auto'),
    whiteSpace: props => (props.overflow ? 'nowrap' : 'normal'),
  },
  {
    ignoreAttributes: ['backgroundColor', 'position'],
  },
);

type SidebarProps = {
  /**
   * Position of the sidebar.
   */
  position: SidebarPosition,

  /**
   * Default width of the sidebar.  Only used for left/right sidebars.
   */
  width?: number,
  /**
   * Minimum sidebar width. Only used for left/right sidebars.
   */
  minWidth?: number,
  /**
   * Maximum sidebar width. Only used for left/right sidebars.
   */
  maxWidth?: number,

  /**
   * Default height of the sidebar.
   */
  height?: number,
  /**
   * Minimum sidebar height. Only used for top/bottom sidebars.
   */
  minHeight?: number,
  /**
   * Maximum sidebar height. Only used for top/bottom sidebars.
   */
  maxHeight?: number,

  /**
   * Background color.
   */
  backgroundColor?: string,
  /**
   * Callback when the sidebar size ahs changed.
   */
  onResize?: (width: number, height: number) => void,
  /**
   * Contents of the sidebar.
   */
  children?: React$Node,
  /**
   * Class name to customise styling.
   */
  className?: string,
};

type SidebarState = {|
  width?: number,
  height?: number,
  userChange: boolean,
|};

/**
 * A resizable sidebar.
 */
export default class Sidebar extends Component<SidebarProps, SidebarState> {
  constructor(props: SidebarProps, context: Object) {
    super(props, context);
    this.state = {userChange: false, width: props.width, height: props.height};
  }

  static defaultProps = {
    position: 'left',
  };

  componentWillReceiveProps(nextProps: SidebarProps) {
    if (!this.state.userChange) {
      this.setState({width: nextProps.width, height: nextProps.height});
    }
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
    let height, minHeight, maxHeight, width, minWidth, maxWidth;

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
