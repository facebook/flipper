/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import Glyph from './Glyph.js';
import styled from '../styled/index.js';
import type {StyledComponent} from '../styled/index.js';
import {findDOMNode} from 'react-dom';
import PropTypes from 'prop-types';
import {colors} from './colors.js';
import {connect} from 'react-redux';
import electron from 'electron';

const borderColor = props => {
  if (!props.windowIsFocused) {
    return colors.macOSTitleBarButtonBorderBlur;
  } else if (props.type === 'danger') {
    return colors.red;
  } else {
    return colors.macOSTitleBarButtonBorder;
  }
};
const borderBottomColor = props => {
  if (!props.windowIsFocused) {
    return colors.macOSTitleBarButtonBorderBlur;
  } else if (props.type === 'danger') {
    return colors.red;
  } else {
    return colors.macOSTitleBarButtonBorderBottom;
  }
};

const StyledButton = styled.view(
  {
    backgroundColor: props => {
      if (!props.windowIsFocused) {
        return colors.macOSTitleBarButtonBackgroundBlur;
      } else {
        return colors.white;
      }
    },
    backgroundImage: props =>
      props.windowIsFocused
        ? `linear-gradient(to bottom, transparent 0%,${
            colors.macOSTitleBarButtonBackground
          } 100%)`
        : 'none',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor,
    borderBottomColor,
    fontSize: props => (props.compact === true ? 11 : '1em'),
    color: props => {
      if (props.type === 'danger' && props.windowIsFocused) {
        return colors.red;
      } else if (props.disabled) {
        return colors.macOSTitleBarIconBlur;
      } else {
        return colors.light50;
      }
    },
    borderRadius: 4,
    position: 'relative',
    padding: '0 6px',
    height: props => (props.compact === true ? 24 : 28),
    margin: 0,
    marginLeft: props => (props.inButtonGroup === true ? 0 : 10),
    minWidth: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,

    boxShadow: props =>
      props.pulse && props.windowIsFocused
        ? `0 0 0 ${colors.macOSTitleBarIconSelected}`
        : '',
    animation: props =>
      props.pulse && props.windowIsFocused ? 'pulse 1s infinite' : '',

    '&:not(:first-child)': {
      borderTopLeftRadius: props => (props.inButtonGroup === true ? 0 : 4),
      borderBottomLeftRadius: props => (props.inButtonGroup === true ? 0 : 4),
    },

    '&:not(:last-child)': {
      borderTopRightRadius: props => (props.inButtonGroup === true ? 0 : 4),
      borderBottomRightRadius: props => (props.inButtonGroup === true ? 0 : 4),
      borderRight: props => (props.inButtonGroup === true ? 0 : ''),
    },

    '&:first-of-type': {
      marginLeft: 0,
    },

    '&:active': {
      borderColor: colors.macOSTitleBarButtonBorder,
      borderBottomColor: colors.macOSTitleBarButtonBorderBottom,
      background: `linear-gradient(to bottom, ${
        colors.macOSTitleBarButtonBackgroundActiveHighlight
      } 1px, ${colors.macOSTitleBarButtonBackgroundActive} 0%, ${
        colors.macOSTitleBarButtonBorderBlur
      } 100%)`,
    },

    '&:disabled': {
      borderColor,
      borderBottomColor,
      pointerEvents: 'none',
    },

    '&:hover::before': {
      content: props => (props.dropdown ? "''" : ''),
      position: 'absolute',
      bottom: 1,
      right: 2,
      borderStyle: 'solid',
      borderWidth: '4px 3px 0 3px',
      borderColor: props =>
        `${colors.macOSTitleBarIcon} transparent transparent transparent`,
    },
  },
  {
    ignoreAttributes: [
      'dropdown',
      'dispatch',
      'compact',
      'large',
      'windowIsFocused',
      'inButtonGroup',
      'danger',
      'pulse',
    ],
  },
);

const Icon = Glyph.extends(
  {
    marginRight: props => (props.hasText ? 3 : 0),
  },
  {
    ignoreAttributes: ['hasText', 'type'],
  },
);

type Props = {
  /**
   * onClick handler.
   */
  onClick?: (event: SyntheticMouseEvent<>) => void,
  /**
   * Whether this button is disabled.
   */
  disabled?: boolean,
  /**
   * Whether this button is large. Increases padding and line-height.
   */
  large?: boolean,
  /**
   * Whether this button is compact. Decreases padding and line-height.
   */
  compact?: boolean,
  /**
   * Type of button.
   */
  type?: 'primary' | 'success' | 'warning' | 'danger',
  /**
   * Children.
   */
  children?: React$Node,
  /**
   * Dropdown menu template shown on click.
   */
  dropdown?: Array<Electron$MenuItemOptions>,
  /**
   * Name of the icon dispalyed next to the text
   */
  icon?: string,
  iconSize?: number,
  /**
   * For toggle buttons, if the button is selected
   */
  selected?: boolean,
  /**
   * Button is pulsing
   */
  pulse?: boolean,
  /**
   * URL to open in the browser on click
   */
  href?: string,
};

type State = {
  active: boolean,
};

/**
 * Simple button.
 *
 * **Usage**
 *
 * ```jsx
 * import {Button} from 'sonar';
 * <Button onClick={handler}>Click me</Button>
 * ```
 *
 * @example Default button
 *   <Button>Click me</Button>
 * @example Primary button
 *   <Button type="primary">Click me</Button>
 * @example Success button
 *   <Button type="success">Click me</Button>
 * @example Warning button
 *   <Button type="warning">Click me</Button>
 * @example Danger button
 *   <Button type="danger">Click me</Button>
 * @example Default solid button
 *   <Button solid={true}>Click me</Button>
 * @example Primary solid button
 *   <Button type="primary" solid={true}>Click me</Button>
 * @example Success solid button
 *   <Button type="success" solid={true}>Click me</Button>
 * @example Warning solid button
 *   <Button type="warning" solid={true}>Click me</Button>
 * @example Danger solid button
 *   <Button type="danger" solid={true}>Click me</Button>
 * @example Compact button
 *   <Button compact={true}>Click me</Button>
 * @example Large button
 *   <Button large={true}>Click me</Button>
 * @example Disabled button
 *   <Button disabled={true}>Click me</Button>
 */
class Button extends styled.StylableComponent<
  Props & {windowIsFocused: boolean},
  State,
> {
  static contextTypes = {
    inButtonGroup: PropTypes.bool,
  };

  state = {
    active: false,
  };

  _ref: ?Element | ?Text;

  onMouseDown = () => this.setState({active: true});
  onMouseUp = () => this.setState({active: false});

  onClick = (e: SyntheticMouseEvent<>) => {
    if (this.props.disabled === true) {
      return;
    }
    if (this.props.dropdown) {
      const menu = electron.remote.Menu.buildFromTemplate(this.props.dropdown);
      const position = {};
      if (this._ref != null && this._ref instanceof Element) {
        const {left, bottom} = this._ref.getBoundingClientRect();
        position.x = parseInt(left, 10);
        position.y = parseInt(bottom + 6, 10);
      }
      menu.popup(electron.remote.getCurrentWindow(), {
        async: true,
        ...position,
      });
    }
    if (this.props.onClick) {
      this.props.onClick(e);
    }
    if (this.props.href != null) {
      electron.shell.openExternal(this.props.href);
    }
  };

  setRef = (ref: ?React.ElementRef<any>) => {
    this._ref = findDOMNode(ref);
  };

  render() {
    const {
      icon,
      children,
      selected,
      iconSize,
      windowIsFocused,
      ...props
    } = this.props;
    const {active} = this.state;

    let color = colors.macOSTitleBarIcon;
    if (props.disabled === true) {
      color = colors.macOSTitleBarIconBlur;
    } else if (windowIsFocused && selected === true) {
      color = colors.macOSTitleBarIconSelected;
    } else if (!windowIsFocused && (selected == null || selected === false)) {
      color = colors.macOSTitleBarIconBlur;
    } else if (!windowIsFocused && selected === true) {
      color = colors.macOSTitleBarIconSelectedBlur;
    } else if (selected == null && active) {
      color = colors.macOSTitleBarIconActive;
    } else if (props.type === 'danger') {
      color = colors.red;
    }

    let iconComponent;
    if (icon != null) {
      iconComponent = (
        <Icon
          name={icon}
          size={
            iconSize != null ? iconSize : this.props.compact === true ? 12 : 16
          }
          color={color}
          hasText={Boolean(children)}
        />
      );
    }

    return (
      <StyledButton
        {...props}
        ref={this.setRef}
        windowIsFocused={windowIsFocused}
        onClick={this.onClick}
        onMouseDown={this.onMouseDown}
        onMouseUp={this.onMouseUp}
        inButtonGroup={this.context.inButtonGroup}>
        {iconComponent}
        {children}
        {this.props.pulse === true && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
        @keyframes pulse {
          0% {
            box-shadow: 0 0 4px 0 ${colors.macOSTitleBarIconSelected};
          }
          70% {
            box-shadow: 0 0 4px 6px transparent;
          }
          100% {
            box-shadow: 0 0 4px 0 transparent;
          }
        }
      `,
            }}
          />
        )}
      </StyledButton>
    );
  }
}

const ConnectedButton = connect(({application: {windowIsFocused}}) => ({
  windowIsFocused,
}))(Button);

// $FlowFixMe
export default (ConnectedButton: StyledComponent<Props>);
