/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties} from 'react';
import styled from '@emotion/styled';
import FlexColumn from './FlexColumn';
import FlexBox from './FlexBox';
import {colors} from './colors';
import Glyph from './Glyph';
import {theme} from 'flipper-plugin';

const BORDER = `1px solid ${theme.dividerColor}`;

const Chevron = styled(Glyph)({
  marginRight: 4,
  marginLeft: -2,
  marginBottom: 1,
});
Chevron.displayName = 'Panel:Chevron';

/**
 * A Panel component.
 */
export default class Panel extends React.Component<
  {
    /**
     * Class name to customise styling.
     */
    className?: string;
    /**
     * Whether this panel is floating from the rest of the UI. ie. if it has
     * margin and a border.
     */
    floating?: boolean;
    /**
     * Whether the panel takes up all the space it can. Equivalent to the following CSS:
     *
     *  height: 100%;
     *  width: 100%;
     */
    grow?: boolean;
    /**
     * Heading for this panel. If this is anything other than a string then no
     * padding is applied to the heading.
     */
    heading: React.ReactNode;
    /**
     * Contents of the panel.
     */
    children?: React.ReactNode;
    /**
     * Whether the panel header and body have padding.
     */
    padded?: boolean;
    /**
     * Whether the panel can be collapsed. Defaults to true
     */
    collapsable: boolean;
    /**
     * Initial state for panel if it is collapsable
     */
    collapsed?: boolean;
    /**
     * Heading for this panel. If this is anything other than a string then no
     * padding is applied to the heading.
     */
    accessory?: React.ReactNode;
    style?: CSSProperties;
  },
  {
    collapsed: boolean;
  }
> {
  static defaultProps: {
    floating: boolean;
    grow: boolean;
    collapsable: boolean;
  } = {
    grow: false,
    floating: true,
    collapsable: true,
  };

  static PanelContainer = styled(FlexColumn)<{
    floating?: boolean;
    collapsed?: boolean;
    grow?: boolean;
  }>((props) => ({
    flexShrink: 0,
    flexGrow: props.grow ? 1 : undefined,
    padding: props.floating ? 10 : 0,
    borderBottom: props.collapsed ? 'none' : BORDER,
  }));

  static PanelHeader = styled(FlexBox)<{floating?: boolean; padded?: boolean}>(
    (props) => ({
      userSelect: 'none',
      color: theme.textColorPrimary,
      backgroundColor: theme.backgroundWash,
      border: props.floating ? BORDER : 'none',
      borderBottom: BORDER,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      justifyContent: 'space-between',
      lineHeight: '27px',
      fontWeight: 500,
      flexShrink: 0,
      padding: props.padded ? '0 10px' : 0,
      '&:not(:first-child)': {
        borderTop: BORDER,
      },
    }),
  );

  static PanelBody = styled(FlexColumn)<{floating?: boolean; padded?: boolean}>(
    (props) => ({
      backgroundColor: theme.backgroundDefault,
      border: props.floating ? BORDER : 'none',
      borderBottomLeftRadius: 2,
      borderBottomRightRadius: 2,
      borderTop: 'none',
      flexGrow: 1,
      padding: props.padded ? 10 : 0,
      overflow: 'visible',
    }),
  );
  state = {
    collapsed: this.props.collapsed == null ? false : this.props.collapsed,
  };

  onClick = () => this.setState({collapsed: !this.state.collapsed});

  render() {
    const {
      padded,
      children,
      className,
      grow,
      floating,
      heading,
      collapsable,
      accessory,
      style,
    } = this.props;
    const {collapsed} = this.state;
    return (
      <Panel.PanelContainer
        className={className}
        floating={floating}
        grow={grow}
        collapsed={collapsed}
        style={style}>
        <Panel.PanelHeader
          floating={floating}
          padded={padded || typeof heading === 'string'}
          onClick={this.onClick}>
          <span>
            {collapsable && (
              <Chevron
                color={colors.macOSTitleBarIcon}
                name={collapsed ? 'triangle-right' : 'triangle-down'}
                size={12}
              />
            )}
            {heading}
          </span>
          {accessory}
        </Panel.PanelHeader>

        {children == null || (collapsable && collapsed) ? null : (
          <Panel.PanelBody
            scrollable
            grow={grow}
            padded={padded == null ? true : padded}
            floating={floating}>
            {children}
          </Panel.PanelBody>
        )}
      </Panel.PanelContainer>
    );
  }
}
