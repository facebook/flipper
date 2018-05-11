/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import FlexColumn from './FlexColumn.js';

import styled from '../styled/index.js';
import FlexBox from './FlexBox.js';

import {colors} from './colors.js';
import Glyph from './Glyph.js';

const BORDER = '1px solid #dddfe2';
const ignoreAttributes = ['floating', 'padded'];

const Chevron = Glyph.extends({
  marginRight: 4,
  marginLeft: -2,
  marginBottom: 1,
});

/**
 * A Panel component.
 */
export default class Panel extends styled.StylableComponent<
  {|
    /**
     * Class name to customise styling.
     */
    className?: string,
    /**
     * Whether this panel is floating from the rest of the UI. ie. if it has
     * margin and a border.
     */
    floating?: boolean,
    /**
     * Whether the panel takes up all the space it can. Equivalent to the following CSS:
     *
     *  height: 100%;
     *  width: 100%;
     */
    fill?: boolean,
    /**
     * Heading for this panel. If this is anything other than a string then no
     * padding is applied to the heading.
     */
    heading: React$Node,
    /**
     * Contents of the panel.
     */
    children?: React$Node,
    /**
     * Whether the panel header and body have padding.
     */
    padded?: boolean,
    /**
     * Whether the panel can be collapsed. Defaults to true
     */
    collapsable: boolean,
    /**
     * Initial state for panel if it is collapsable
     */
    collapsed?: boolean,
    /**
     * Heading for this panel. If this is anything other than a string then no
     * padding is applied to the heading.
     */
    accessory?: React$Node,
  |},
  {
    collapsed: boolean,
  },
> {
  static defaultProps: {|
    floating: boolean,
    fill: boolean,
    collapsable: boolean,
  |} = {
    fill: false,
    floating: true,
    collapsable: true,
  };

  static PanelContainer = FlexColumn.extends(
    {
      flexShrink: 0,
      padding: props => (props.floating ? 10 : 0),
      borderBottom: props => (props.collapsed ? 'none' : BORDER),
    },
    {ignoreAttributes: ['collapsed', ...ignoreAttributes]},
  );

  static PanelHeader = FlexBox.extends(
    {
      backgroundColor: '#f6f7f9',
      border: props => (props.floating ? BORDER : 'none'),
      borderBottom: BORDER,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      justifyContent: 'space-between',
      lineHeight: '27px',
      fontWeight: 500,
      flexShrink: 0,
      padding: props => (props.padded ? '0 10px' : 0),
      '&:not(:first-child)': {
        borderTop: BORDER,
      },
    },
    {ignoreAttributes},
  );

  static PanelBody = FlexColumn.extends(
    {
      backgroundColor: '#fff',
      border: props => (props.floating ? BORDER : 'none'),
      borderBottomLeftRadius: 2,
      borderBottomRightRadius: 2,
      borderTop: 'none',
      flexGrow: 1,
      padding: props => (props.padded ? 10 : 0),
    },
    {ignoreAttributes},
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
      fill,
      floating,
      heading,
      collapsable,
      accessory,
    } = this.props;
    const {collapsed} = this.state;
    return (
      <Panel.PanelContainer
        className={className}
        floating={floating}
        fill={fill}
        collapsed={collapsed}>
        <Panel.PanelHeader
          floating={floating}
          padded={typeof heading === 'string'}
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
            fill={fill}
            padded={padded == null ? true : padded}
            floating={floating}>
            {children}
          </Panel.PanelBody>
        )}
      </Panel.PanelContainer>
    );
  }
}
